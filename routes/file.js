const express = require('express');
const multer = require('multer');
const path = require('path');
const uniqueString = require('unique-string');
const streamifier = require('streamifier');
const fs = require('fs');
const fileType = require('file-type');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const setting = require('../setting.json');
const utils = require('../utils');

const File = require('../schemas/file');
const Comment = require('../schemas/comment');
const Like = require('../schemas/like');

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
    if(req.file.mimetype != 'application/octet-stream' || (path.extname(req.file.originalname) != '.rhythmcraft' && path.extname(req.file.originalname) != '.signedrhythmcraft')) {
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
        file_type: 'note',
        description: '레벨에 대해 말해보세요!'
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

    const comments = await Comment.find({ note_name : req.query.name });
    comments.forEach(async comment => {
        await Like.deleteMany({ comment_id : comment.id });
    });

    await Comment.deleteMany({ note_name : req.query.name });

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

app.post('/signnote', utils.isAdmin, upload.single('file'), async (req, res, next) => {
    if(req.file.mimetype != 'application/octet-stream' || path.extname(req.file.originalname) != '.rhythmcraft') {
        req.flash('Error', '채보 파일이 아닙니다.');
        return res.redirect('/note');
    }
    if(req.file.size > 1024 * 1024 * 100) {
        req.flash('Error', '파일이 100MB를 초과합니다.');
        return res.redirect('/');
    }

    const name = `${uniqueString()}.signedrhythmcraft`;

    const note = JSON.parse(req.file.buffer.toString('utf-8'));
    const token = jwt.sign(note, setting.TOKEN_SECRET, {
        issuer: setting.SERVER_NAME
    });
    fs.writeFileSync(path.join(setting.SAVE_FILE_PATH, name), token);

    await File.create({
        name,
        originalname: req.file.originalname.replace('.rhythmcraft', '.signedrhythmcraft'),
        owner: req.user.fullID,
        file_type: 'note',
        description: '레벨에 대해 말해보세요!'
    });

    req.flash('Info', `서명된 채보 ${req.file.originalname}이(가) 성공적으로 업로드되었습니다. 채보 관리 페이지에서 확인하세요.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });
    return res.redirect('/admin/sign');
});

app.get('/signnotetext', utils.isAdmin, async (req, res, next) => {
    const testnote = await File.findOne({ owner : req.user.fullID , file_type : 'note' , name : req.query.name });
    if(!testnote) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/note');
    }

    const name = `${uniqueString()}.signedrhythmcraft`;

    const note = JSON.parse(fs.readFileSync(path.join(setting.SAVE_FILE_PATH, req.query.name)));
    const token = jwt.sign(note, setting.TOKEN_SECRET, {
        issuer: setting.SERVER_NAME
    });
    fs.writeFileSync(path.join(setting.SAVE_FILE_PATH, name), token);

    await File.create({
        name,
        originalname: req.query.originalname.replace('.rhythmcraft', '.signedrhythmcraft'),
        owner: req.user.fullID,
        file_type: 'note',
        description: '레벨에 대해 말해보세요!'
    });

    req.flash('Info', `채보 ${req.query.originalname}를 성공적으로 서명하였습니다.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });
    return res.redirect('/note');
});

app.get('/unsignnote', utils.isAdmin, async (req, res, next) => {
    const testnote = await File.findOne({ owner : req.user.fullID , file_type : 'note' , name : req.query.name });
    if(!testnote) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/note');
    }

    if(path.extname(testnote.name) != '.signedrhythmcraft') {
        req.flash('Error', '서명된 채보 파일이 아닙니다.');
        return res.redirect('/note');
    }

    const name = `${uniqueString()}.rhythmcraft`;

    const note = String(fs.readFileSync(path.join(setting.SAVE_FILE_PATH, req.query.name)));
    const result = utils.verifyToken(note);
    if (result.error) {
        req.flash('Error', `채보 오류 : ${result.message}`);
        return res.redirect('/note');
    }
    fs.writeFileSync(path.join(setting.SAVE_FILE_PATH, name), JSON.stringify(result));

    await File.create({
        name,
        originalname: req.query.originalname.replace('.signedrhythmcraft', '.rhythmcraft'),
        owner: req.user.fullID,
        file_type: 'note',
        description: '레벨에 대해 말해보세요!'
    });

    req.flash('Info', `채보 ${req.query.originalname}를 성공적으로 서명 해제하였습니다.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });
    return res.redirect('/note');
});

app.get('/notestatus', utils.isLogin, async (req, res, next) => {
    const file = await File.findOne({ name : req.query.name , file_type : 'note' });
    if(!file) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/note');
    }
    if(!req.user.admin && file.owner != req.user.fullID) {
        req.flash('Error', '권한이 없습니다.');
        return res.redirect('/note');
    }

    await File.updateOne({ name : req.query.name , file_type : 'note' } , { public : req.query.public == 'true' });
    req.flash('Info', `${file.originalname} 채보 공개 상태가 업데이트되었습니다.`);
    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });
    return res.redirect('/note');
});

app.post('/editnotedescription', utils.isLogin, async (req, res, next) => {
    const checkfile = await File.findOne({ name : req.body.name , owner : req.user.fullID , file_type : 'note' });
    if(!checkfile) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/note');
    }

    await File.updateOne({ name : req.body.name , owner : req.user.fullID , file_type : 'note' }, { description : req.body.description });

    req.flash('Info', `${checkfile.originalname} 채보의 설명이 수정되었습니다.`);
    return res.redirect('/note');
});

app.get('/saveworkshopnote', utils.isLogin, async (req, res, next) => {
    const checkfile = await File.findOne({ name : req.query.name , file_type : 'note' , public : true });
    if(!checkfile) {
        req.flash('Error', '해당 채보가 존재하지 않습니다.');
        return res.redirect('/workshop');
    }

    const name = `${uniqueString()}${path.extname(req.query.name)}`;
    fs.copyFileSync(path.join(setting.SAVE_FILE_PATH, req.query.name), path.join(setting.SAVE_FILE_PATH, name));
    await File.create({
        name,
        originalname: checkfile.originalname,
        owner: req.user.fullID,
        file_type: 'note',
        description: '레벨에 대해 말해보세요!'
    });

    req.app.get('socket_game').to(`user_${req.user.fullID}`).emit('msg', { 'action' : 'updatenote' });

    req.flash('Info', '채보를 나의 노트 보관함에 저장했습니다.');
    return res.redirect(`/workshop/note?name=${req.query.name}`);
});

app.post('/upload_avatar', utils.isLogin, upload.single('file'), async (req, res, next) => {
    const filetype = await fileType.fromBuffer(req.file.buffer);
    if(!filetype || !filetype.mime.startsWith('image/')) {
        req.flash('Error', '이미지 파일이 아닙니다.');
        return res.redirect('/upload_avatar');
    }
    if(req.file.size > 1024 * 1024 * 10) {
        req.flash('Error', '파일이 10MB를 초과합니다.');
        return res.redirect('/');
    }

    const name = `avatar_${req.user.fullID}`;
    streamifier.createReadStream(req.file.buffer).pipe(fs.createWriteStream(path.join(setting.AVATAR_PATH, name)));

    await File.deleteMany({ owner : req.user.fullID , file_type : 'avatar' });
    await File.create({
        name,
        originalname: req.file.originalname,
        owner: req.user.fullID,
        file_type: 'avatar'
    });

    req.flash('Info', `프로필 사진 ${req.file.originalname}이(가) 성공적으로 업로드되었습니다.`);
    return res.redirect('/mypage');
});

module.exports = app;