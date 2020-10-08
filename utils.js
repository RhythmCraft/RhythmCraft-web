const jwt = require('jsonwebtoken');

const setting = require('./setting.json');

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max + 1);
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports.isLogin = (req, res, next) => {
    if(!req.isAuthenticated()) {
        res.redirect('/login');
        return;
    }
    next();
}

module.exports.isNotLogin = (req, res, next) => {
    if(req.isAuthenticated()) {
        res.redirect('/');
        return;
    }
    next();
}

module.exports.isAdmin = (req, res, next) => {
    if(!req.isAuthenticated()) {
        res.redirect('/login');
        return;
    }
    if(!req.user.admin) {
        res.redirect('/');
        return;
    }
    next();
}

module.exports.verifyToken = token => {
    try {
        const decoded = jwt.verify(token, setting.TOKEN_SECRET);
        return decoded;
    }
    catch(err) {
        if(err.name == 'TokenExpiredError') {
            return { "error" : true , "code" : "error" , "message" : "토큰이 만료되었습니다." , "errcode" : err.name };
        }
        return { "error" : true , "code" : "error" , "message" : "유효하지 않은 토큰입니다." , "errcode" : err.name };
    }
}

module.exports.getRandomNote = key_limit => {
    return key_limit[getRandomInt(0, key_limit.length - 1)];
};