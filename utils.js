const jwt = require('jsonwebtoken');
const Url = require('url');
const uniqueString = require('unique-string');

const Promotion = require('./schemas/promotion');

const setting = require('./setting.json');

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max + 1);
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports.getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max + 1);
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports.isLogin = (req, res, next) => {
    if(!req.isAuthenticated()) {
        res.redirect(`/login?redirect=${encodeURIComponent(req.url)}`);
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
}

const createPromotion = async () => {
    let promotion_code = uniqueString().substring(0, 25).replace(/(.{5})/g,"$1-").toUpperCase();
    if(promotion_code.endsWith('-')) promotion_code = promotion_code.slice(0, -1);

    const check = await Promotion.findOne({
        code: promotion_code
    });
    if(!check) return promotion_code;
    else return createPromotion();
}

module.exports.createPromotion = createPromotion;

module.exports.escapeHTML = s => {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}