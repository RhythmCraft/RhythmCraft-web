const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const uniqueString = require('unique-string');

const utils = require('../utils');
const setting = require('../setting.json');

const User = require('../schemas/user');
const File = require('../schemas/file');
const Comment = require('../schemas/comment');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/workshop', async (req, res, next) => {
    const regex = new RegExp(req.query.search || '');
    const notes = await File.find({ file_type : 'note' , public : true , originalname : { $regex : regex } }).skip(Number(req.query.page) * (req.query.limit || 20) - (req.query.limit || 20)).limit(Number(req.query.limit));
    const count = await File.countDocuments({ file_type : 'note' , public : true , originalname : { $regex : regex } });

    if(count == 0) {
        req.flash('Error', '검색 결과가 없습니다.');
        return res.redirect('/workshop');
    }

    if(Math.ceil(count / (req.query.limit || 20)) < (req.query.page || 1)) {
        req.flash('Error', '페이지가 잘못되었습니다.');
        return res.redirect('/workshop');
    }
    return res.render('workshop', {
        notes,
        count,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20
    });
});

app.get('/workshop/note', async (req, res, next) => {
    const note = await File.findOne({ name : req.query.name , public : true , file_type : 'note' });
    if(!note) {
        req.flash('Error', '해당 채보는 창작마당에 존재하지 않습니다.');
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

    const creator = await User.findOne({ fullID : note.owner });
    const comments = await Comment.find({ note_name : note.name }).sort('-pin');

    for(let i in comments) {
        comments[i]['user'] = await User.findOne({ fullID : comments[i]['writer'] });

        let profile_image = await File.findOne({ owner : comments[i]['writer'] , file_type : 'avatar' });
        if(!profile_image) profile_image = '/img/no_avatar.png';
        else profile_image = `/avatar/${profile_image.name}`;

        comments[i]['avatar'] = profile_image;

        comments[i]['pinuser'] = await User.findOne({ fullID : comments[i]['pin_by'] });
    }

    return res.render('workshop_note', {
        note,
        note_file: token_result || note_file,
        creator,
        User,
        File,
        comments
    });
});

app.post('/workshop/note/comment', utils.isLogin, async (req, res, next) => {
    const note = await File.findOne({ name : req.body.name });
    if(!note) {
        req.flash('Error', '해당 채보는 창작마당에 존재하지 않습니다.');
        return res.redirect(`/workshop`);
    }

    await Comment.create({
        writer: req.user.fullID,
        note_name: req.body.name,
        text: req.body.text,
        id: uniqueString(),
        createdAt: Date.now()
    });

    req.flash('Info', '댓글이 달렸습니다.');
    return res.redirect(`/workshop/note?name=${req.body.name}`);
});

app.get('/workshop/note/removecomment', utils.isLogin, async (req, res, next) => {
    const comment = await Comment.findOne({ id : req.query.comment });
    if(!comment) {
        req.flash('Error', '해당 댓글이 존재하지 않습니다.');
        return res.redirect(`/workshop`);
    }

    const note = await File.findOne({ name : comment.note_name , file_type : 'note' });

    if(!req.user.admin && note.owner != req.user.fullID && comment.writer != req.user.fullID) {
        req.flash('Error', '권한이 없습니다.');
        return res.redirect(`/workshop/note?name=${comment.note_name}`);
    }

    await Comment.deleteOne({ id : req.query.comment });

    req.flash('Info', '댓글을 삭제했습니다.');
    return res.redirect(`/workshop/note?name=${comment.note_name}`);
});

app.get('/workshop/note/pincomment', utils.isLogin, async (req, res, next) => {
    const comment = await Comment.findOne({ id : req.query.comment });
    if(!comment) {
        req.flash('Error', '해당 댓글이 존재하지 않습니다.');
        return res.redirect(`/workshop`);
    }

    const note = await File.findOne({ name : comment.note_name , file_type : 'note' });

    if(!req.user.admin && note.owner != req.user.fullID) {
        req.flash('Error', '권한이 없습니다.');
        return res.redirect(`/workshop/note?name=${comment.note_name}`);
    }

    await Comment.updateMany({ note_name : note.name }, { pin : 0 , pin_by : 'nobody' });
    await Comment.updateOne({ id : req.query.comment }, { pin : 1 , pin_by : req.user.fullID });

    req.flash('Info', '댓글을 고정했습니다.');
    return res.redirect(`/workshop/note?name=${comment.note_name}`);
});

app.get('/workshop/note/unpincomment', utils.isLogin, async (req, res, next) => {
    const comment = await Comment.findOne({ id : req.query.comment });
    if(!comment) {
        req.flash('Error', '해당 댓글이 존재하지 않습니다.');
        return res.redirect(`/workshop`);
    }

    const note = await File.findOne({ name : comment.note_name , file_type : 'note' });

    if(!req.user.admin && note.owner != req.user.fullID) {
        req.flash('Error', '권한이 없습니다.');
        return res.redirect(`/workshop/note?name=${comment.note_name}`);
    }
    
    await Comment.updateOne({ id : req.query.comment }, { pin : 0 , pin_by : 'nobody' });

    req.flash('Info', '댓글을 고정 해제했습니다.');
    return res.redirect(`/workshop/note?name=${comment.note_name}`);
});

module.exports = app;