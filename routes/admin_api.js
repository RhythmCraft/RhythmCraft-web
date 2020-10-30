const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const User = require('../schemas/user');
const Chat = require('../schemas/chat');

const utils = require('../utils');
const setting = require('../setting.json');

const app = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.post('/admin_editaccount', utils.isAdmin, async (req, res, next) => {
    await User.updateOne({ fullID : req.body.before_fullID }, {
        nickname: req.body.nickname,
        email: req.body.email,
        snsID: req.body.snsID,
        fullID: req.body.fullID,
        provider: req.body.provider,
        nick_set: req.body.nick_set == 'true',
        allow_email_ad: req.body.allow_email_ad == 'true',
        admin: req.body.admin == 'true',
        verified: req.body.verified == 'true',
        block_login: new Date(req.body.block_login).getTime(),
        block_login_reason: req.body.block_login_reason,
        block_chat: new Date(req.body.block_chat).getTime(),
        block_chat_reason: req.body.block_chat_reason
    });

    res.redirect(`/admin/user?id=${req.body.fullID}`);
    return;
});

app.post('/admin_mail', utils.isAdmin, async (req, res, next) => {
    const users = await User.find({ allow_email_ad : true }, { _id : 0 , email : 1 });

    let receive_list = [];
    users.forEach(user => {
        receive_list.push(user.email);
    });

    const transport = nodemailer.createTransport(setting.SMTP_INFO);

    const message = {
        from: setting.SMTP_MAIL_ADDRESS,
        envelope: {
            from: setting.SMTP_MAIL_ADDRESS,
            to: receive_list
        },
        subject: req.body.subject,
        html: req.body.html
    }

    transport.sendMail(message, (err, info) => {
        if(err) {
            console.error(err);
        }
        else {
            console.log(info.response);
        }
    });
    res.redirect('/admin/mail');
    return;
});

app.get('/remove-report', utils.isAdmin, async (req, res, next) => {
    const chat = await Chat.findOne({ chat_id : req.query.chat , reported : true });
    if(!chat) {
        req.flash('Error', '신고된 채팅중 해당 채팅을 찾을 수 없습니다.');
        return res.redirect('/admin/chat-report');
    }

    await Chat.updateOne({ chat_id : req.query.chat , reported : true } , { reported : false , reported_by : 'no_user' });
    req.flash('Info', '요청이 처리되었습니다. 신고 관리 목록에서 제거하였습니다.');
    return res.redirect('/admin/chat-report');
});

module.exports = app;