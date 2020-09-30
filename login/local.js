const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const User = require('../schemas/user');

module.exports = (passport) => {
    passport.use(new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            const exUser = await User.findOne({ email : email , provider : 'local' });
            if(exUser != null) {
                const result = await bcrypt.compare(password, exUser.password);
                if(result) {
                    if(!exUser.join_finish) {
                        done(null, false, { message: '이메일 인증을 마치지 않은 회원입니다. 이메일 인증 후 로그인 가능합니다. 메일함을 확인하세요.' });
                    }
                    done(null, exUser);
                }
                else {
                    done(null, false, { message: '비밀번호가 일치하지 않습니다.' });
                }
            }
            else {
                done(null, false, { message: '가입되지 않은 회원입니다.' });
            }
        } catch(err) {
            console.error(err);
        }
    }));
}