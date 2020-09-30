const User = require('../schemas/user');
const KakaoStrategy = require('passport-kakao').Strategy;
const uniqueString = require('unique-string');

const login = require('../login.json');

module.exports = (passport) => {
    passport.use(new KakaoStrategy({
        clientID: login.KAKAO_CLIENT_ID,
        clientSecret: login.KAKAO_CLIENT_SECRET,
        callbackURL: login.KAKAO_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        const user = await User.findOne({snsID: profile.id, provider: profile.provider});
        if (user != null) {
            return done(null, user);
        } else {
            const newUser = new User({
                nickname: uniqueString(),
                snsID: profile.id,
                fullID: `${profile.provider}-${profile.id}`,
                provider: profile.provider,
                email: profile.email || null
            });
            await newUser.save();
            const user = await User.findOne({snsID: profile.id, provider: profile.provider});
            return done(null, user);
        }
    }));
}