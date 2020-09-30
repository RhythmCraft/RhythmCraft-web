const express = require('express');
const bodyParser = require('body-parser');
const uniqueString = require('unique-string');
const fs = require('fs');
const path = require('path');

const utils = require('../utils');
const setting = require('../setting.json');

const Room = require('../schemas/room');
const File = require('../schemas/file');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/room', async (req, res, next) => {
    const rooms = await Room.find({});
    return res.render('room', {
        rooms
    });
});

app.get('/newroom', utils.isLogin, async (req, res, next) => {
    const files = await File.find({ owner : req.user.fullID , public : true , file_type : 'music' });
    const notes = await File.find({ owner : req.user.fullID , file_type : 'note' });
    return res.render('newroom', {
        files,
        notes
    });
});

app.post('/newroom', utils.isLogin, async (req, res, next) => {
    if(req.body.max_player < 2 || req.body.max_player > 8) {
        req.flash('Error', '플레이어 구성이 잘못되었습니다.');
        return res.redirect('/');
    }
    let note;
    let note_file;
    if(req.body.note != 'rhythmcraft_mode') {
        note = await File.findOne({ name : req.body.note , file_type : 'note' });
        if(!note) {
            req.flash('Error', '채보 선택이 잘못되었습니다.');
            return res.redirect('/');
        }
        note_file = JSON.parse(fs.readFileSync(path.join(setting.SAVE_FILE_PATH, note.name)));
    }

    const music = await File.findOne({ name : note != null ? note_file.music : req.body.music , public : true , file_type : 'music' });

    if(!music) {
        req.flash('Error', '음악이 잘못되었습니다.');
        return res.redirect('/');
    }

    const roomcode = uniqueString();
    await Room.deleteMany({ master : req.user.fullID });
    const result = await Room.create({
        name: req.body.name,
        master: req.user.fullID,
        password: req.body.password,
        note_speed: req.body.note_speed,
        max_player: req.body.max_player,
        roomcode,
        music: music.name,
        music_name: music.originalname,
        note: note_file
    });

    res.redirect(`/game?room=${roomcode}#master`);
    return req.app.get('socket_main').emit('msg', { "action" : "reload_room" });
});

module.exports = app;