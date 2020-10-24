const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qr-image');

const utils = require('../utils');
const setting = require('../setting.json');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.post('/qrloginapi', (req, res, next) => {
    const deny_appver = [ "1" ];
    const beta_mode = false;
    if(!beta_mode && req.body.alphaapp == 'true') return req.app.get('socket_qrlogin').to(req.body.socketID).emit('msg', {
        "action": "alert",
        "msg": "알파, 베타 테스트중이 아닙니다. 프로덕션 앱을 구글 플레이에서 다운받으세요."
    });
    if(deny_appver.indexOf(req.body.appversion) != -1) return req.app.get('socket_qrlogin').to(req.body.socketID).emit('msg', {
        "action": "alert",
        "msg": "앱 버전이 낮습니다. 업데이트 후 사용 가능합니다."
    });
    
    req.app.get('socket_qrlogin').to(req.body.socketID).emit('msg', {
        "action": "qrlogin",
        "email": req.body.email,
        "password": req.body.password
    });
    return res.send('ok');
});

app.get('/getqrcode', utils.isNotLogin, async (req, res, next) => {
    if(!req.query.socketID) {
        req.flash('Error', '잘못된 요청입니다.');
        return res.redirect('/');
    }
    const data = {
        "RequestURL" : `${req.protocol}://${req.hostname}:${setting.PORT}/qrloginapi`,
        "socketID": req.query.socketID.replace('<sh>', '#')
    }
    const img = qrcode.image(JSON.stringify(data), { type: 'png' });
    return img.pipe(res);
});

app.get('/qrappprivacy', (req, res, next) => {
    return res.send(`<h1>카메라는 QR코드 인식에만 사용되며, 이미지는 저장되지 않습니다.</h1>`);
})

module.exports = app;