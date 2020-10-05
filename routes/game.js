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
        files,
        notes
    });
});

app.get('/editor', utils.isLogin, async (req, res, next) => {
    if(req.query.name.includes('.signedrhythmcraft')) {
        req.flash('Error', '서명된 채보는 수정할 수 없습니다.');
        return res.redirect('/');
    }

    const note = await File.findOne({ name : req.query.name , file_type: 'note' , owner : req.user.fullID });
    if(!note) {
        req.flash('Error', '해당 채보 파일이 존재하지 않습니다.');
        return res.redirect('/');
    }

    const note_file = fs.readFileSync(path.join(setting.SAVE_FILE_PATH, note.name)).toString();

    res.render('editor', {
        note_file
    });
});

app.get('/testnote', utils.isLogin, async (req, res, next) => {
    const note = await File.findOne({ name : req.query.note , file_type : 'note' });
    if(!note || (!note.public && note.owner != req.user.fullID)) {
        req.flash('Error', '해당 채보가 존재하지 않거나 접근 권한이 없습니다.');
        return res.redirect('/');
    }

    let token_result;
    let note_file = String(fs.readFileSync(path.join(setting.SAVE_FILE_PATH, note.name)));

    if(path.extname(note.name) == '.signedrhythmcraft') {
        token_result = utils.verifyToken(note_file);
        if (token_result.error) return res.send(`채보 오류 : ${token_result.message}`);
    }
    else {
        note_file = JSON.parse(note_file);
    }

    const music = await File.findOne({ name : !token_result ? note_file.music : token_result.music , public : true , file_type : 'music' });
    if(!music) {
        req.flash('Error', '음악이 잘못되었습니다.');
        return res.redirect('/');
    }

    const roomcode = uniqueString();
    await Room.deleteMany({ master : req.user.fullID });
    await Room.create({
        name: roomcode,
        master: req.user.fullID,
        password: '',
        note_speed: 1000,
        max_player: 1,
        roomcode,
        music: music.name,
        music_name: music.originalname,
        note: token_result || note_file,
        startpos: req.query.startpos,
        public: false,
        room_for_note_test: req.query.fromeditor == 'true',
        note_name_for_note_test: note.name,
        room_from_workshop: req.query.from_workshop == 'true',
        room_for_single_play: req.query.singleplay == 'true',
        pitch: req.query.pitch,
        autoplay: req.query.autoplay == 'true',
        trusted: !token_result ? req.query.unsafe == 'true' : true,
        note_name: req.query.note
    });

    return res.redirect(`/game?room=${roomcode}#start`);
});

module.exports = app;