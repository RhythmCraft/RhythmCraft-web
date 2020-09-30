const express = require('express');

const utils = require('../utils');
const setting = require('../setting.json');

const Room = require('../schemas/room');

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

module.exports = app;