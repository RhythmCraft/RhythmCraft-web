// 기본 모듈
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const uniqueString = require('unique-string');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const User = require('../schemas/user');

// 셋팅 파일, 로그인 설정 파일, 유틸
const utils = require('../utils');
const setting = require('../setting.json');
const login = require('../login.json');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

// 세션
app.use(session({
    secret: setting.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// 패스포트 설정
app.use(passport.initialize());
app.use(passport.session());

// 로그인 파일 불러오기
fs.readdirSync('./login').forEach((file) => {
    require(`../login/${file}`)(passport);
});

// 로그인 페이지
const login_dir_list = fs.readdirSync('./login');
login_dir_list.splice(login_dir_list.indexOf('local.js'), 1);
login_dir_list.forEach((file) => {
    const provider = file.replace('.js', '');

    app.get(`/login/${provider}`,(req, res, next) => {
        if(req.isAuthenticated()) {
            res.redirect('/');
            return;
        }
        else {
            next();
        }
    }, passport.authenticate(provider), (req, res, next) => {
        return;
    });

    app.get(login[`${provider.toUpperCase()}_CALLBACK_URL`], passport.authenticate(provider, {
        failureRedirect: '/loginfail'
    }), (req, res, next) => {
        res.redirect('/');
        return;
    });
});

// 메인 로그인 페이지
app.get('/login', utils.isNotLogin, (req, res, next) => {
    res.render('login', {
        login: login,
        login_list: login_dir_list,
        socket: `${req.protocol}://${req.hostname}:${setting.PORT}`
    });
    return;
});

// 로그 아웃
app.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
    return;
});

// 로그인 실패 페이지
app.get('/loginfail', (req, res, next) => {
    res.send('<h1>로그인 실패!</h1><h2>로그인에 실패하였습니다. <a href="/login">이곳</a>을 클릭해 다시 시도할 수 있습니다.</h2>');
    return;
});

// 로컬 로그인 코드
app.post('/login', utils.isNotLogin, (req, res, next) => {
    passport.authenticate( 'local', (authError, user, info) => {
        if(authError) {
            console.error(authError);
            if(!res.headersSent) return res.redirect('/loginfail');
        }
        if(!user) {
            req.flash('Error', info.message);
            if(!res.headersSent) return res.redirect('/login');
        }
        return req.login(user, (loginError) => {
            if(loginError) {
                console.error(loginError);
            }
            if(!res.headersSent) return res.redirect('/');
        });
    })(req, res, next);
});

// 회원가입
app.get('/join', utils.isNotLogin, (req, res, next) => {
    // return res.send('<h1>아직은 가입할 수 없어요!</h1>');
    return res.render('join');
});

app.post('/join', utils.isNotLogin, async (req, res, next) => {
    const exUser = await User.findOne({ email : req.body.email , provider : 'local' });
    if(exUser != null) {
        req.flash('Error', '이미 가입된 이메일입니다.');
        return res.redirect('/join');
    }
    const checkNick = await User.findOne({ nickname : req.body.nickname });
    if(checkNick != null) {
        req.flash('Error', '이미 해당 닉네임이 사용 중입니다.');
        return res.redirect('/join');
    }
    if(req.body.nickname == '' || req.body.email == '' || req.body.password == '') {
        req.flash('Error', '필수 입력란을 입력하지 않았습니다.');
        return res.redirect('/join');
    }
    const hash = await bcrypt.hash(req.body.password, 12);
    const userID = uniqueString();
    await User.create({
        email: req.body.email,
        password: hash,
        nickname: req.body.nickname,
        allow_email_ad: req.body.allow_email_ad == 'true',
        provider: 'local',
        snsID: userID,
        fullID : userID,
        nick_set: true,
        join_finish: false
    });

    const transport = nodemailer.createTransport(setting.SMTP_INFO);
    const token = jwt.sign({
        account_fullID: userID,
        email: req.body.email
    }, setting.TOKEN_SECRET, {
        issuer: setting.SERVER_NAME,
        expiresIn: '1d'
    });

    const message = {
        from: setting.SMTP_MAIL_ADDRESS,
        to: req.body.email,
        subject: `${setting.SERVER_NAME} 이메일 인증`,
        html: `<!DOCTYPE html>
<h1>최근 이 이메일로 ${setting.SERVER_NAME} 가입이 시도되었습니다.</h1>
<h1>가입을 완료하려면 아래 [가입 완료] 링크를, 가입하지 않으려면 [가입 취소] 링크를 클릭해주세요.</h1>

<a href="${req.protocol}://${req.hostname}/verifymail?token=${token}&join=true">[가입 완료]</a>
<a href="${req.protocol}://${req.hostname}/verifymail?token=${token}&join=false">[가입 취소]</a>
`
    }
    transport.sendMail(message);

    res.redirect('/login');
});

app.get('/verifymail', async (req, res, next) => {
    const token_result = utils.verifyToken(req.query.token);
    if(token_result.error) return res.send(token_result.message);

    if(req.query.join == 'true') {
        await User.updateOne({ fullID : token_result.account_fullID }, { join_finish : true });
        res.send(`<h1>요청이 정상적으로 처리되었습니다!</h1><h2><a href="/">메인으로 돌아가기</a></h2>`);
        return;
    }
    else {
        const user = await User.findOne({ fullID : token_result.account_fullID });
        if(user.join_finish) {
            return res.send('이미 가입된 계정은 취소할 수 없습니다.');
        }
        await User.deleteOne({ fullID : token_result.account_fullID });
        return res.send(`<h1>작업 취소가 완료되었습니다. 이 링크 없이는 다른 사람이 이 이메일 관련 설정을 할 수 없습니다.</h1><h2><a href="/">메인으로 돌아가기</a></h2>`);
    }
});

app.get('/change_email', utils.isLogin, (req, res, next) => {
    res.render('change_email');
});

app.post('/change_email', utils.isLogin, async (req, res, next) => {
    const exUser = await User.findOne({ email : req.body.email });
    if(exUser != null) {
        req.flash('Error', '이미 해당 이메일이 사용중입니다.');
        return res.redirect('/');
    }

    const token = jwt.sign({
        account_fullID: req.user.fullID,
        email: req.body.email
    }, setting.TOKEN_SECRET, {
        issuer: setting.SERVER_NAME,
        expiresIn: '15m'
    });

    const transport = nodemailer.createTransport(setting.SMTP_INFO);
    const message = {
        from: setting.SMTP_MAIL_ADDRESS,
        to: req.body.email,
        subject: `${setting.SERVER_NAME} 이메일 변경`,
        html: `<!DOCTYPE html>
<h1>최근 ${req.user.nickname}(${req.user.fullID}) 계정이 자신의 이메일을 이 이메일로 변경하려고 시도했습니다.</h1>
<h1>변경을 완료하려면 아래 [변경 완료] 링크를 눌러주세요.</h1>

<a href="${req.protocol}://${req.hostname}/change_email_accept?token=${token}">[변경 완료]</a>
`
    }
    transport.sendMail(message);

    res.redirect('/');
});

app.get('/change_email_accept', async (req, res, next) => {
    const token_result = utils.verifyToken(req.query.token);
    if(token_result.error) return res.send(token_result.message);

    await User.updateOne({ fullID : token_result.account_fullID }, { email : token_result.email });
    res.send(`<h1>요청이 정상적으로 처리되었습니다!</h1><h2><a href="/">메인으로 돌아가기</a></h2>`);
    return;
});

app.get('/find_my_password', (req, res, next) => {
    res.render('find_my_password');
});

app.post('/find_my_password', async (req, res, next) => {
    const user = await User.findOne({ email : req.body.email , provider : 'local' });
    if(user == null) {
        req.flash('Error', '존재하지 않는 계정입니다.');
        return res.redirect('/find_my_password');
    }

    const token = jwt.sign({
        account_fullID: user.fullID
    }, setting.TOKEN_SECRET, {
        issuer: setting.SERVER_NAME,
        expiresIn: '30m'
    });

    const transport = nodemailer.createTransport(setting.SMTP_INFO);
    const message = {
        from: setting.SMTP_MAIL_ADDRESS,
        to: req.body.email,
        subject: `${setting.SERVER_NAME} 비밀번호 변경`,
        html: `<!DOCTYPE html>
<h1>${user.nickname}(${user.fullID}) 계정의 비밀번호 찾기 링크입니다.</h1>
<h1>비밀번호를 변경하려면 아래 [변경하기] 링크를 눌러주세요.</h1>

<a href="${req.protocol}://${req.hostname}/change_password?token=${token}">[변경하기]</a>
`
    }
    transport.sendMail(message);

    req.flash('Info', '이메일을 발송했습니다. 이메일로 보내진 링크를 눌러 비밀번호를 변경하세요.(30분간만 유효합니다.)');
    res.redirect('/find_my_password');
});

app.get('/change_password', (req, res, next) => {
    const token_result = utils.verifyToken(req.query.token);
    if(token_result.error) return res.send(token_result.message);

    res.render('change_password', {
        token: req.query.token
    });
});

app.post('/change_password', async (req, res, next) => {
    const token_result = utils.verifyToken(req.body.token);
    if(token_result.error) return res.send(token_result.message);

    const hash = await bcrypt.hash(req.body.password, 12);

    await User.updateOne({ fullID : token_result.account_fullID }, { password : hash });
    return res.send(`<h1>비밀번호가 변경되었습니다.</h1><h2><a href="/">메인으로 돌아가기</a></h2>`);
});

module.exports = app;