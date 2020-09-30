const express = require('express');
const bodyParser = require('body-parser');
const User = require('../schemas/user');

const utils = require('../utils');
const setting = require('../setting.json');

const app = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/mypage', utils.isLogin, (req, res, next) => {
    res.render('mypage');
});

app.post('/editaccount', utils.isLogin, async (req, res, next) => {
    const exUser = await User.findOne({ nickname : req.body.nickname });
    if(exUser != null && exUser.fullID != req.user.fullID) {
        req.flash('Error', '해당 닉네임이 이미 사용 중입니다!');
        return res.redirect('/mypage');
    }
    if(req.body.nickname.includes('<') || req.body.nickname.includes('>')) {
        req.flash('Error', '닉네임에 허용되지 않은 문자 < 또는 >가 포함되어 있습니다!');
        return res.redirect('/mypage');
    }

    try {
        await User.updateOne({
            snsID: req.user.snsID,
            provider: req.user.provider
        }, {
            nickname: req.body.nickname,
            allow_email_ad: req.body.allow_email_ad == 'true',
            nick_set: true,
            rhythm_key_1: req.body.InputKey1,
            rhythm_key_2: req.body.InputKey2,
            rhythm_key_3: req.body.InputKey3,
            rhythm_key_4: req.body.InputKey4,
            rhythm_key_5: req.body.InputKey5,
            rhythm_key_6: req.body.InputKey6,
            rhythm_key_7: req.body.InputKey7,
            rhythm_key_8: req.body.InputKey8
        });
        res.redirect('/mypage');
    } catch(err) {
        console.error(err);
        req.flash('Error', 'DB에 오류가 발생하였습니다.');
        res.redirect('/mypage');
    }
    return;
});

module.exports = app;