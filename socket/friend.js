const Url = require('url');

const User = require('../schemas/user');
const File = require('../schemas/file');

module.exports = io => {
    io.on('connection', async socket => {
        const session = socket.request.session;
        let user;
        if(session.isLogin) user = await User.findOne({ fullID : session.passport.user.fullID });
        const url = Url.parse(socket.request.headers.referer);

        socket.join('everyone');

        if(!user) socket.join('not_login');
        else {
            socket.join('login');
            socket.join(`user_${user.fullID}`);
            if(url.pathname.startsWith('/friend')) socket.join(`friendpage_${user.fullID}`);

            user.friends.forEach(f => {
                socket.join(`friend_${f}`);
            });
        }

        let status;
        switch(url.pathname) {
            case '/':
                status = '메인 메뉴';
                break;
            case '/game':
                status = '게임 플레이';
                break;
            case '/game/':
                status = '게임 플레이';
                break;
            case '/newroom':
                status = '방 생성 중';
                break;
            default:
                status = '알 수 없음'
        }
        if(url.pathname.startsWith('/workshop')) status = '창작마당 탐색';

        if(user != null) {
            await User.updateOne({ fullID : user.fullID }, { status , online : true });
            io.to(`friend_${user.fullID}`).emit('updateStatus', {
                fullID: user.fullID,
                status: status,
                online: true
            });

            if(session.rejoined_time > 10000 && url.pathname == '/') {
                let avatar = await File.findOne({ owner : user.fullID, file_type : 'avatar' });
                if (!avatar) avatar = '/img/no_avatar.png';
                else avatar = `/avatar/${avatar.name}`;

                io.to(`friend_${user.fullID}`).emit('toast', {
                    image: avatar,
                    title: '친구 접속 알림',
                    text: `${user.nickname}님이 접속하였습니다!`,
                    options: {
                        delay: 3000
                    },
                    allow_html: false
                });
            }
        }

        // socket.emit('toast', {
        //     image: '/favicon.ico',
        //     title: 'test',
        //     text: '와! 샌즈 아시는구나!',
        //     options: {
        //         autohide: false
        //     },
        //     allow_html: false
        // });

        socket.on('disconnect', async () => {
            if(user != null) {
                await User.updateOne({ fullID : user.fullID }, { status : '오프라인' , online : false });

                io.to(`friend_${user.fullID}`).emit('updateStatus', {
                    fullID: user.fullID,
                    status: '오프라인',
                    online: false
                });
            }
        });
    });
}