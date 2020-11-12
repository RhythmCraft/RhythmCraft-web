const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const User = require('../schemas/user');
const Chat = require('../schemas/chat');
const Promotion = require('../schemas/promotion');
const Item = require('../schemas/item');

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
        block_chat_reason: req.body.block_chat_reason,
        rhythm_key_1: req.body.InputKey1,
        rhythm_key_2: req.body.InputKey2,
        rhythm_key_3: req.body.InputKey3,
        rhythm_key_4: req.body.InputKey4,
        rhythm_key_5: req.body.InputKey5,
        rhythm_key_6: req.body.InputKey6,
        rhythm_key_7: req.body.InputKey7,
        rhythm_key_8: req.body.InputKey8,
        show_accurary_center: req.body.show_accurary_center == 'true',
        game_skin: req.body.game_skin,
        custom_game_skin: req.body.custom_game_skin,
        money: req.body.money
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

app.post('/admin_create_promotion', utils.isAdmin, async (req, res, next) => {
    const allowed_type = [ 'money' , 'item' ];
    if(!allowed_type.includes(req.body.type)) {
        req.flash('Error', '프로모션 코드 타입이 잘못되었습니다!');
        return res.redirect('/admin/create-promotion');
    }
    if(req.body.type == 'money' && !req.body.promotion_money) {
        req.flash('Error', '프로모션 코드 타입이 돈일 경우 돈을 입력해야 합니다!');
        return res.redirect('/admin/create-promotion');
    }
    if(req.body.type == 'item' && !req.body.promotion_item) {
        req.flash('Error', '프로모션 코드 타입이 아이템일 경우 아이템 코드를 입력해야 합니다!');
        return res.redirect('/admin/create-promotion');
    }
    if(req.body.multi_code == 'true' && !req.body.count) {
        req.flash('Error', '코드 여러개 생성시 코드 생성 갯수를 입력해야 합니다!');
        return res.redirect('/admin/create-promotion');
    }
    if(req.body.multi_code == 'true' && isNaN(req.body.count)) {
        req.flash('Error', '코드 생성 갯수는 유효한 숫자만 입력해야 합니다!');
        return res.redirect('/admin/create-promotion');
    }
    if(req.body.multi_code == 'true' && req.body.count < 2) {
        req.flash('Error', '코드 여러개 생성시 코드 생성 갯수는 2 이상이어야 합니다!');
        return res.redirect('/admin/create-promotion');
    }
    if(req.body.type == 'money' && req.body.promotion_money < 1) {
        req.flash('Error', '지급할 돈은 0원보다 커야 합니다!');
        return res.redirect('/admin/create-promotion');
    }
    if(req.body.type == 'item') {
        const checkitem = await Item.findOne({ product_id : req.body.promotion_item });
        if(!checkitem) {
            req.flash('Error', '해당 아이템 코드로 아이템을 찾을 수 없습니다!');
            return res.redirect('/admin/create-promotion');
        }
    }

    if(req.body.multi_code == 'true') {
        let csv = `${setting.SERVER_NAME} Promotion Code\n`;
        for(let i = 1; i <= req.body.count; i++) {
            const promotion_code = await utils.createPromotion();

            await Promotion.create({
                code: promotion_code,
                expires: new Date(req.body.expires).getTime(),
                type: req.body.type,
                promotion_money: req.body.promotion_money,
                promotion_item: req.body.promotion_item
            });

            csv += `${promotion_code}\n`;
        }

        res.setHeader('Content-Disposition', 'attachment; filename="promotion.csv"');
        return res.send(csv);
    }
    else {
        const promotion_code = await utils.createPromotion();
        await Promotion.create({
            code: promotion_code,
            expires: new Date(req.body.expires).getTime(),
            type: req.body.type,
            promotion_money: req.body.promotion_money,
            promotion_item: req.body.promotion_item
        });

        req.flash('Info', `프로모션 코드가 생성되었습니다!<br>코드 : ${promotion_code}`);
        return res.redirect('/admin/create-promotion');
    }
});

module.exports = app;