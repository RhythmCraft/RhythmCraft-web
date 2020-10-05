const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const User = require('../schemas/user');

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
        block_login: req.body.block_login == 'true',
        admin: req.body.admin == 'true',
        verified: req.body.verified == 'true'
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

module.exports = app;