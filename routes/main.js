const express = require('express');

const utils = require('../utils');
const setting = require('../setting.json');

const File = require('../schemas/file');

// app 정의
const app = express.Router();

app.get('/', (req, res, next) => {
    return res.render('main');
});

app.get('/debug', utils.isLogin, (req, res, next) => {
    return res.render('debug', {
        req
    });
});

app.get('/adofai-converter', utils.isLogin, async (req, res, next) => {
    const files = await File.find({ owner : req.user.fullID , file_type : 'music' });
    return res.render('adofai-converter', {
        files
    });
});

module.exports = app;