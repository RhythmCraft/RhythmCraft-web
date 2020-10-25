const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const User = require('../schemas/user');
const File = require('../schemas/file');

const utils = require('../utils');
const setting = require('../setting.json');

const app = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/mypage', utils.isLogin, (req, res, next) => {
    const game_skins = fs.readdirSync('./public/skin/game').map(n => n.replace('.css', ''));
    res.render('mypage', {
        game_skins
    });
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

    const user = await User.findOne({ fullID : req.user.fullID });
    let verified = user.verified;
    if(user.nickname != req.body.nickname) verified = false;

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
            rhythm_key_8: req.body.InputKey8,
            verified,
            show_accurary_center: req.body.show_accurary_center == 'true',
            game_skin: req.body.game_skin,
            custom_game_skin: req.body.custom_game_skin
        });
        res.redirect('/mypage');
    } catch(err) {
        console.error(err);
        req.flash('Error', 'DB에 오류가 발생하였습니다.');
        res.redirect('/mypage');
    }
    return;
});

app.get('/upload_avatar', utils.isLogin, (req, res, next) => {
    return res.render('upload_avatar');
});

app.get('/profile', async (req, res, next) => {
    const profile_user = await User.findOne({ fullID : req.query.id || req.user.fullID });
    if(!profile_user) {
        req.flash('Error', '해당 유저는 존재하지 않습니다.');
        return res.redirect('/');
    }

    let profile_image = await File.findOne({ owner : req.query.id || req.user.fullID , file_type : 'avatar' });
    if(!profile_image) profile_image = '/img/no_avatar.png';
    else profile_image = `/avatar/${profile_image.name}`;

    const notes = await File.find({ owner : req.query.id || req.user.fullID , file_type : 'note' , public : true });

    return res.render('profile', {
        profile_user,
        profile_image,
        notes
    });
});

module.exports = app;