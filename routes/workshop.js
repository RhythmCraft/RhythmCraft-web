const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const utils = require('../utils');
const setting = require('../setting.json');

const User = require('../schemas/user');
const File = require('../schemas/file');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/workshop', async (req, res, next) => {
    const notes = await File.find({ file_type : 'note' , public : true }).skip(Number(req.query.page) * 20 - 20).limit(Number(req.query.limit));
    const count = await File.countDocuments({ file_type : 'note' , public : true });
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

    const creator = await User.findOne({ fullID : note.owner});

    return res.render('workshop_note', {
        note,
        note_file: token_result || note_file,
        creator
    });
});

module.exports = app;