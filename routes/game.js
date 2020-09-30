const express = require('express');
const bodyParser = require('body-parser');
const uniqueString = require('unique-string');

const utils = require('../utils');
const setting = require('../setting.json');

const Room = require('../schemas/room');
const File = require('../schemas/file');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/game', utils.isLogin, async (req, res, next) => {
    const room = await Room.findOne({ roomcode : req.query.room });
    if(!room) {
        req.flash('Error', '해당 게임이 존재하지 않습니다.');
        return res.redirect('/');
    }

    const files = await File.find({ owner : req.user.fullID , public : true , file_type : 'music' });
    const notes = await File.find({ owner : req.user.fullID , file_type : 'note' });

    return res.render('game', {
        room_have_password: room.password != '',
        socket: `${req.protocol}://${req.hostname}:${setting.PORT}`,
        files,
        notes
    });
});

module.exports = app;