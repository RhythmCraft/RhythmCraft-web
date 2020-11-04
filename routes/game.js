const express = require('express');
const bodyParser = require('body-parser');
const uniqueString = require('unique-string');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const utils = require('../utils');
const setting = require('../setting.json');

const Room = require('../schemas/room');
const File = require('../schemas/file');
const Chat = require('../schemas/chat');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

const upload = multer({
    storage: multer.memoryStorage()
});

app.get('/game', utils.isLogin, async (req, res, next) => {
    const room = await Room.findOne({ roomcode : req.query.room });
    if(!room) {
        req.flash('Error', '해당 게임이 존재하지 않습니다.');
        return res.redirect('/');
    }

    const files = await File.find({ owner : req.user.fullID , public : true , file_type : 'music' });
    const notes = await File.find({ owner : req.user.fullID , file_type : 'note' });

    return res.render('game', {
        room_have_password: room.password != null && room.password != '',
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

app.post('/chat-report', utils.isLogin, async (req, res, next) => {
    const chat = await Chat.findOne({ chat_id : req.body.chat_id });
    if(!chat) return res.send('잘못된 채팅 ID입니다.');
    if(chat.fullID == req.user.fullID) return res.send('스스로 벤?');
    if(chat.reported) return res.send('신고가 접수되었습니다. 관리자 확인 후 신고가 처리됩니다.');

    await Chat.updateOne({ chat_id : req.body.chat_id }, { reported : true , reported_by : req.user.fullID });
    return res.send('신고가 접수되었습니다. 관리자 확인 후 신고가 처리됩니다.');
    // return res.send('wa sans ashinenguna gup na are ryop seph ni da nen hut so ri go sasil not implemented yet');
});

app.get('/replay', utils.isLogin, (req, res, next) => {
    return res.render('replay');
});

app.post('/replay', utils.isLogin, upload.single('file'), async (req, res, next) => {
    if(!req.file.originalname.endsWith('.rhythmcraftreplay')) {
        req.flash('Error', '리플레이 파일이 아닙니다.');
        return res.redirect('/replay');
    }

    let note_file = String(req.file.buffer);

    let token_result = utils.verifyToken(note_file);
    if (token_result.error) {
        req.flash('Error', `리플레이 오류 : ${token_result.message}`);
        return res.redirect('/replay');
    }

    if(!token_result.replay) {
        req.flash('Error', '이 파일은 채보 파일입니다. 리플레이 파일을 업로드하세요.');
        return res.redirect('/replay');
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
        note_name_for_note_test: token_result.name,
        room_for_replay: true,
        pitch: req.query.pitch,
        autoplay: req.query.autoplay == 'true',
        trusted: true,
        note_name: req.query.note
    });

    return res.redirect(`/game?room=${roomcode}#start`);
});

module.exports = app;