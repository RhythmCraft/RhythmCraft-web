// 기본 모듈
const express = require('express');
const http = require('http');
const https = require('https');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
const fs = require('fs');
const path = require('path');
const Url = require('url');

// 데이터베이스 스키마
const User = require('./schemas/user');
const Room = require('./schemas/room');
const RoomUser = require('./schemas/room_user');
const File = require('./schemas/file');
const Comment = require('./schemas/comment');

// 웹소켓
const webSocket = require('./socket');

// 설정 파일, 유틸
const setting = require('./setting.json');

// app 정의
const app = express();

// 몽고디비 스키마 연결
const connect = require('./schemas');
connect();

// SSL 관련 설정
let options;
if(setting.USE_SSL) {
    options = {
        cert: fs.readFileSync(setting.SSL_CERT),
        key: fs.readFileSync(setting.SSL_KEY)
    }
}

// 로그인 관련 코드
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj, done) => {
    User.findOne({ snsID: obj.snsID , provider: obj.provider })
        .then(user => done(null, user))
        .catch(err => done(err));
});

// 세션, REDIS
let sessionMiddleware;
if(setting.USE_REDIS) {
    const client = redis.createClient({
        host: setting.REDIS_HOST,
        port: setting.REDIS_PORT,
        password: setting.REDIS_PASSWORD,
        logError: true
    });
    sessionMiddleware = session({
        secret: setting.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: new RedisStore({ client: client }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
    app.use(sessionMiddleware);
}
else {
    sessionMiddleware = session({
        secret: setting.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    });
    app.use(sessionMiddleware);
}

// 쿠키 파서
app.use(cookieParser());

// Flash 설정
app.use(flash());

// 로그인 관련 코드
app.use(passport.initialize());
app.use(passport.session());

// 정적 파일 제공
const staticoptions = {
    index: setting.INDEX
}
app.use(express.static(__dirname + "/public/", staticoptions));
app.use('/avatar', express.static(path.join(setting.AVATAR_PATH), staticoptions));

// view engine을 EJS로 설정
app.set('views', './views');
app.set('view engine', 'ejs');

// 로그인 파일 불러오기
fs.readdirSync('./login').forEach((file) => {
    require(`./login/${file}`)(passport);
});

// IE 경고
app.use((req, res, next) => {
    if(/trident|msie/gi.test(req.get('User-Agent'))) {
        req.flash('Warn', 'IE는 정상 작동을 보장하지 않습니다. <a href="https://www.google.com/chrome/">Chrome</a>, <a href="https://www.mozilla.org/ko-KR/firefox/new/">FireFox</a>, <a href="https://whale.naver.com/ko/download">Whale</a> 등의 최신 브라우저를 이용해주세요.');
    }
    next();
});

// 벤 감지
app.use((req, res, next) => {
    if(req.isAuthenticated() && req.user.block_login) {
        req.logout();
        req.flash('Error', '정지된 계정입니다. 관리자에게 문의하세요.');
        return res.redirect('/login');
    }
    next();
});

// 닉네임 설정하지 않은 유저 닉네임 설정시키기
app.use((req, res, next) => {
    if(req.isAuthenticated() && !req.user.nick_set && req.url != '/mypage' && req.url != '/editaccount') return res.redirect('/mypage');
    next();
});

// 미리 템플릿 엔진 변수 넣기
app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.logined = req.isAuthenticated();
    res.locals.isAdmin = req.isAuthenticated() && req.user.admin;
    res.locals.servername = setting.SERVER_NAME;
    res.locals.Error = req.flash('Error');
    res.locals.Info = req.flash('Info');
    res.locals.Warn = req.flash('Warn');
    res.locals.session = req.session;
    res.locals.isClient = req.session.isClient || false;
    res.locals.socket = `${req.protocol}://${req.hostname}:${setting.PORT}`;
    res.locals.query = req.query;
    res.locals.referrer = req.get('referrer');
    res.locals.referrer_path = req.get('referrer') != null ? Url.parse(req.get('referrer')).path : req.url;
    next();
});

// 헤더 설정
app.use((req, res, next) => {
    res.set('Referrer-Policy', 'no-referrer-when-downgrade');
    next();
});

// 클라이언트 인식
app.use((req, res, next) => {
    if(req.query.isClient == 'true') req.session.isClient = true;
    if(req.query.isClient == 'false') req.session.isClient = false;
    if(req.session.isClient && !req.isAuthenticated() && !req.url.startsWith('/login') && !req.url.startsWith('/getqrcode')) return res.redirect('/login');
    next();
});

// 라우터 불러오기
console.log('라우터를 불러오는 중...');
fs.readdirSync('./routes').forEach((file) => {
    app.use(require(`./routes/${file}`));
    console.log(`${file} 라우터를 불러왔습니다.`);
});
console.log('라우터를 모두 불러왔습니다.\n');

// 서버 구동
let server;
if(setting.USE_SSL) {
    server = https.createServer(options, app).listen(setting.PORT, () => {
        console.log('보안 서버가 구동중입니다!');
    });
}
else {
    server = http.createServer(app).listen(setting.PORT, () => {
        console.log("서버가 구동중입니다!");
    });
}

webSocket(server, app, sessionMiddleware);

setImmediate(async () => {
    await Room.deleteMany({});
    await RoomUser.deleteMany({});
});