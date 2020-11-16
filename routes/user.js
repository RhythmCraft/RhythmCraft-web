const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const User = require('../schemas/user');
const File = require('../schemas/file');
const Item = require('../schemas/item');

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

    let badge;
    if(profile_user.equip.image_badge != null) badge = await Item.findOne({ product_id : profile_user.equip.image_badge });

    const notes = await File.find({ owner : req.query.id || req.user.fullID , file_type : 'note' , public : true });

    return res.render('profile', {
        profile_user,
        profile_image,
        notes,
        badge: badge != null ? badge.image_name : null
    });
});

app.get('/friend', utils.isLogin, async (req, res, next) => {
    const friends = [];
    const friend_request_user = [];
    for(let f of req.user.friends) {
        const user = await User.findOne({ fullID : f });
        friends.push(user);
    }
    for(let f of req.user.friend_request) {
        const user = await User.findOne({ fullID : f });
        friend_request_user.push(user);
    }

    return res.render('friend', {
        friends,
        friend_request_user
    });
});

app.post('/friend_request', utils.isLogin, async (req, res, next) => {
    if(req.body.nickname == req.user.nickname) {
        req.flash('Info', '나 자신은 영원한 인생의 친구입니다.');
        return res.redirect('/friend');
    }
    const friend_user = await User.findOne({ nickname : req.body.nickname });
    if(!friend_user) {
        req.flash('Error', '해당 유저를 찾을 수 없습니다.');
        return res.redirect('/friend');
    }
    if(friend_user.blocked_user.includes(req.user.fullID)) {
        req.flash('Error', '해당 유저가 나를 차단하여 친구 추가를 할 수 없습니다.');
        return res.redirect('/friend');
    }
    if(friend_user.friend_request.includes(req.user.fullID)) {
        req.flash('Error', '해당 유저에게 이미 친구 요청을 보냈습니다. 응답을 기다려주세요!');
        return res.redirect('/friend');
    }
    if(req.user.friends.includes(friend_user.fullID)) {
        req.flash('Error', '해당 유저와 이미 친구입니다.');
        return res.redirect('/friend');
    }

    const friend_request_list = friend_user.friend_request;
    friend_request_list.push(req.user.fullID);
    await User.updateOne({ nickname : req.body.nickname }, { friend_request : friend_request_list });

    let avatar = await File.findOne({ owner : friend_user.fullID , file_type : 'avatar' });
    if(!avatar) avatar = '/img/no_avatar.png';
    else avatar = `/avatar/${avatar.name}`;
    
    req.app.get('socket_friend').to(`user_${friend_user.fullID}`).emit('toast', {
        image: avatar,
        title: '친구 요청',
        text: `${req.user.nickname}님이 친구 요청을 전송하였습니다. 메뉴에서 친구를 눌러 요청을 확인하세요.`,
        options: {
            delay: 5000
        },
        allow_html: false
    });

    req.flash('Info', `${req.body.nickname}님에게 친구 요청을 보냈습니다.`);
    return res.redirect('/friend');
});

app.get('/accept_friend_request/:user', utils.isLogin, async (req, res, next) => {
    if(!req.user.friend_request.includes(req.params.user)) {
        req.flash('Error', '해당 유저는 친구 요청을 보내지 않았습니다.');
        return res.redirect('/friend');
    }
    const target_friend = await User.findOne({ fullID : req.params.user });

    const friend_request = req.user.friend_request;
    friend_request.splice(friend_request.indexOf(req.params.user), 1);
    await User.updateOne({ fullID : req.user.fullID }, { friend_request });

    if(!target_friend) {
        req.flash('Error', '존재하지 않는 유저입니다. 친구 요청을 삭제합니다.');
        return res.redirect('/friend');
    }

    const my_friends = req.user.friends;
    my_friends.push(req.params.user);
    await User.updateOne({ fullID : req.user.fullID }, { friends : my_friends });

    const target_friends = target_friend.friends;
    target_friends.push(req.user.fullID);
    await User.updateOne({ fullID : req.params.user }, { friends : target_friends });

    let avatar = await File.findOne({ owner : req.user.fullID , file_type : 'avatar' });
    if(!avatar) avatar = '/img/no_avatar.png';
    else avatar = `/avatar/${avatar.name}`;

    req.app.get('socket_friend').to(`user_${target_friend.fullID}`).emit('toast', {
        image: avatar,
        title: '친구 요청 수락됨',
        text: `${req.user.nickname}님이 친구 요청을 수락하였습니다!`,
        options: {
            delay: 5000
        },
        allow_html: false
    });

    req.flash('Info', `친구 요청을 받아들여 ${target_friend.nickname}님과 친구가 되었습니다!`);
    return res.redirect('/friend');
});

app.get('/deny_friend_request/:user', utils.isLogin, async (req, res, next) => {
    const friend_user = await User.findOne({ fullID : req.params.user });
    
    const friend_request = req.user.friend_request;
    friend_request.splice(friend_request.indexOf(req.params.user), 1);
    await User.updateOne({ fullID : req.user.fullID }, { friend_request });

    if(friend_user != null) {
        let avatar = await File.findOne({ owner : req.user.fullID , file_type : 'avatar' });
        if (!avatar) avatar = '/img/no_avatar.png';
        else avatar = `/avatar/${avatar.name}`;

        req.app.get('socket_friend').to(`user_${friend_user.fullID}`).emit('toast', {
            image: avatar,
            title: '친구 요청 거절됨',
            text: `${req.user.nickname}님이 친구 요청을 거절하였습니다 :(`,
            options: {
                delay: 5000
            },
            allow_html: false
        });
    }

    req.flash('Info', '해당 친구 요청을 삭제하였습니다.');
    return res.redirect('/friend');
});

app.get('/remove_friend/:user', utils.isLogin, async (req, res, next) => {
    const my_friends = req.user.friends;
    my_friends.splice(my_friends.indexOf(req.params.user), 1);
    await User.updateOne({ fullID : req.user.fullID }, { friends : my_friends });

    const target_friend = await User.findOne({ fullID : req.params.user });
    if(target_friend != null) {
        const target_friends = target_friend.friends;
        target_friends.splice(target_friends.indexOf(req.user.fullID), 1);
        await User.updateOne({ fullID : req.params.user }, { friends : target_friends });
    }

    let avatar = await File.findOne({ owner : req.user.fullID , file_type : 'avatar' });
    if(!avatar) avatar = '/img/no_avatar.png';
    else avatar = `/avatar/${avatar.name}`;

    req.app.get('socket_friend').to(`user_${req.params.user}`).emit('toast', {
        image: avatar,
        title: '친구 삭제 알림',
        text: `${req.user.nickname}님이 나를 친구 목록에서 삭제하였습니다.`,
        options: {
            delay: 10000
        },
        allow_html: false
    });

    req.flash('Info', `${target_friend != null ? target_friend.nickname : '알 수 없음'}님을 친구 목록에서 삭제하였습니다.`);
    return res.redirect('/friend');
});

app.get('/block', utils.isLogin, async (req, res, next) => {
    const blocked = [];
    for(let u of req.user.blocked_user) {
        const user = await User.findOne({ fullID : u });
        blocked.push(user);
    }

    return res.render('block_user', {
        blocked
    });
});

app.post('/block_user', utils.isLogin, async (req, res, next) => {
    const block_user = await User.findOne({ nickname : req.body.nickname });
    if(!block_user) {
        req.flash('Error', '해당 유저가 존재하지 않습니다.');
        return res.redirect(req.get('referrer'));
    }
    if(req.user.blocked_user.includes(block_user.fullID)) {
        req.flash('Error', '해당 유저를 이미 차단하였습니다.');
        return res.redirect(req.get('referrer'));
    }

    const blocked_user = req.user.blocked_user;
    blocked_user.push(block_user.fullID);
    await User.updateOne({ fullID : req.user.fullID }, { blocked_user });

    req.flash('Info', `${req.body.nickname}를 차단하였습니다.`);
    return res.redirect(req.get('referrer'));
});

app.post('/unblock_user', utils.isLogin, async (req, res, next) => {
    const block_user = await User.findOne({ nickname : req.body.nickname });
    if(!block_user) {
        req.flash('Error', '해당 유저가 존재하지 않습니다.');
        return res.redirect(req.get('referrer'));
    }
    if(!req.user.blocked_user.includes(block_user.fullID)) {
        req.flash('Error', '해당 유저를 차단하지 않았습니다.');
        return res.redirect(req.get('referrer'));
    }

    const blocked_user = req.user.blocked_user;
    blocked_user.splice(blocked_user.indexOf(block_user.fullID), 1);
    await User.updateOne({ fullID : req.user.fullID }, { blocked_user });

    req.flash('Info', `${req.body.nickname}를 차단 해제하였습니다.`);
    return res.redirect(req.get('referrer'));
});

module.exports = app;