const express = require('express');
const multer = require('multer');
const path = require('path');
const uniqueString = require('unique-string');
const streamifier = require('streamifier');
const fs = require('fs');
const fileType = require('file-type');
const bodyParser = require('body-parser');

const utils = require('../utils');
const setting = require('../setting.json');

const File = require('../schemas/file');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

const upload = multer({
    storage: multer.memoryStorage()
});

app.get('/music', utils.isLogin, async (req, res, next) => {
    const files = await File.find({ owner : req.user.fullID , file_type : 'music' });
    res.render('manage_music', {
        files
    });
});

app.post('/uploadmusic', utils.isLogin, upload.single('file'), async (req, res, next) => {
    const filetype = await fileType.fromBuffer(req.file.buffer);
    if(!filetype || !filetype.mime.startsWith('audio/')) {
        req.flash('Error', '음악 파일이 아닙니다.');
        return res.redirect('/music');
    }
    if(req.file.size > 1024 * 1024 * 100) {
        req.flash('Error', '파일이 100MB를 초과합니다.');
        return res.redirect('/');
    }

    const name = `${uniqueString()}${path.extname(req.file.originalname)}`;
    streamifier.createReadStream(req.file.buffer).pipe(fs.createWriteStream(path.join(setting.SAVE_FILE_PATH, name)));

    await File.create({
        name,
        originalname: req.file.originalname,
        owner: req.user.fullID,
        file_type: 'music'
    });

    req.flash('Info', `파일 ${req.file.originalname}이(가) 성공적으로 업로드되었습니다.`);
    return res.redirect('/music');
});

app.get('/removemusic', utils.isLogin, async (req, res, next) => {
    const file = await File.findOne({ owner : req.user.fullID , name : req.query.name , file_type : 'music' });
    if(!file) {
        req.flash('Error', '해당 파일이 존재하지 않습니다.');
        return res.redirect('/music');
    }
    fs.unlinkSync(path.join(setting.SAVE_FILE_PATH, file.name));
    await File.deleteOne({ owner : req.user.fullID , name : req.query.name , file_type : 'music' });

    req.flash('Info', `${file.originalname}을(를) 삭제했습니다.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatemusic' });
    return res.redirect('/music');
});

app.get('/listenmusic', async (req, res, next) => {
    const file = await File.findOne({ name : req.query.name , file_type : 'music' });
    if(!file) {
        req.flash('Error', '해당 파일이 존재하지 않습니다.');
        if(req.isAuthenticated()) return res.redirect('/music');
        else return res.redirect('/');
    }
    if((!req.isAuthenticated() || file.owner != req.user.fullID) && !file.public) {
        req.flash('Error', '권한이 없습니다.');
        return res.redirect('/music');
    }
    return res.sendFile(path.join(setting.SAVE_FILE_PATH, req.query.name));
});

app.get('/listenmusic/:music', async (req, res, next) => {
    const file = await File.findOne({ name : req.params.music , file_type : 'music' });
    if(!file) {
        req.flash('Error', '해당 파일이 존재하지 않습니다.');
        if(req.isAuthenticated()) return res.redirect('/music');
        else return res.redirect('/');
    }
    if((!req.isAuthenticated() || file.owner != req.user.fullID) && !file.public) {
        req.flash('Error', '권한이 없습니다.');
        return res.redirect('/music');
    }
    return res.sendFile(path.join(setting.SAVE_FILE_PATH, req.params.music));
});

app.get('/musicstatus', utils.isLogin, async (req, res, next) => {
    const file = await File.findOne({ name : req.query.name , owner : req.user.fullID , file_type : 'music' });
    if(!file) {
        req.flash('Error', '해당 파일이 존재하지 않습니다.');
        return res.redirect('/music');
    }

    await File.updateOne({ name : req.query.name , owner : req.user.fullID , file_type : 'music' } , { public : req.query.public == 'true' });
    req.flash('Info', `${file.originalname} 파일 공개 상태가 업데이트되었습니다.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatemusic' });
    return res.redirect('/music');
});

app.get('/note', utils.isLogin, async (req, res, next) => {
    const files = await File.find({ owner : req.user.fullID , file_type : 'note' });
    res.render('manage_note', {
        files
    });
});

app.post('/uploadnote', utils.isLogin, upload.single('file'), async (req, res, next) => {
    if(req.file.mimetype != 'application/octet-stream' || path.extname(req.file.originalname) != '.rhythmcraft') {
        req.flash('Error', '채보 파일이 아닙니다.');
        return res.redirect('/note');
    }
    if(req.file.size > 1024 * 1024 * 100) {
        req.flash('Error', '파일이 100MB를 초과합니다.');
        return res.redirect('/');
    }

    const name = `${uniqueString()}${path.extname(req.file.originalname)}`;
    streamifier.createReadStream(req.file.buffer).pipe(fs.createWriteStream(path.join(setting.SAVE_FILE_PATH, name)));

    await File.create({
        name,
        originalname: req.file.originalname,
        owner: req.user.fullID,
        file_type: 'note'
    });

    req.flash('Info', `채보 ${req.file.originalname}이(가) 성공적으로 업로드되었습니다.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });
    return res.redirect('/note');
});

app.get('/downloadnote', utils.isLogin, async (req, res, next) => {
    const file = await File.findOne({ owner : req.user.fullID , name : req.query.name , file_type : 'note' });
    if(!file) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/note');
    }
    return res.download(path.join(setting.SAVE_FILE_PATH, file.name), file.originalname);
});

app.get('/removenote', utils.isLogin, async (req, res, next) => {
    const file = await File.findOne({ owner : req.user.fullID , name : req.query.name , file_type : 'note' });
    if(!file) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/note');
    }
    fs.unlinkSync(path.join(setting.SAVE_FILE_PATH, file.name));
    await File.deleteOne({ owner : req.user.fullID , name : req.query.name , file_type : 'note' });

    req.flash('Info', `${file.originalname}을(를) 삭제했습니다.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });
    return res.redirect('/note');
});

app.get('/select_music', utils.isLogin, async (req, res, next) => {
    const files = await File.find({ owner: req.user.fullID , file_type : 'music' , public : true });
    return res.render('select_music', {
        files
    });
});

app.get('/select_note', utils.isLogin, async (req, res, next) => {
    const notes = await File.find({ owner: req.user.fullID , file_type : 'note' });
    return res.render('select_note', {
        notes
    });
});

app.post('/savenote', utils.isLogin, async (req, res, next) => {
    const file = await File.findOne({ owner : req.user.fullID , name : req.body.name , file_type : 'note' });
    if(!file) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/note');
    }

    fs.writeFileSync(path.join(setting.SAVE_FILE_PATH, file.name), JSON.stringify(req.body.note));
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });
    return res.send('ok');
});

module.exports = app;