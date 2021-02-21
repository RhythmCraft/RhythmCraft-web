const Url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const uniqueString = require('unique-string');
const jwt = require('jsonwebtoken');

const User = require('../schemas/user');
const Room = require('../schemas/room');
const RoomUser = require('../schemas/room_user');
const File = require('../schemas/file');
const Chat = require('../schemas/chat');
const Item = require('../schemas/item');

const setting = require('../setting.json');
const utils = require('../utils');

const ko_bad = require('../assets/bad_words.json').words;

module.exports = (io, app) => {
    io.on('connection', async socket => {
        const user = await User.findOne({ fullID : socket.request.session.passport.user.fullID });
        const url = Url.parse(socket.request.headers.referer);
        const url_query = querystring.parse(url.query);
        const socket_url = Url.parse(socket.request.url);
        const socket_url_query = socket.handshake.query;
        const room = await Room.findOne({ roomcode : url_query.room });
        let rtnote = {};
        let starttimestamp;
        let rtnote_timeout = [];
        let notepersecond;
        let pitch;
        let note_name;
        let timestamp = 10000;
        let auto_manage_interval;
        let spectate;

        const check_user = await RoomUser.findOne({ fullID : user.fullID });
        if(check_user != null) {
            io.to(`user_${user.fullID}`).emit('msg', { 'action' : 'exit' , 'message' : '다른 클라이언트에서 이 계정으로 접속하였습니다.\n연결을 해제합니다.' });
            io.connected[check_user.socket_id].disconnect();
        }

        if(!room) {
            socket.emit('msg', {
                'action' : 'exit',
                'message' : '해당 방이 존재하지 않습니다.\n서버가 재시작되었을 수 있습니다.'
            });
            return socket.disconnect();
        }
        let master;
        if(room.master == user.fullID) master = true;
        else master = false;

        if(room.playing) {
            socket.emit('msg', {
                'action': 'spectate',
                'value': true
            });
            spectate = true;
            // socket.emit('msg', {
            //     'action' : 'exit',
            //     'message' : '게임이 플레이 중 입니다.'
            // });
            // return socket.disconnect();
        }
        if(!master && room.password != null && room.password != '' && room.password != socket_url_query.password) {
            socket.emit('msg', {
                'action' : 'exit',
                'message' : '비밀번호가 틀렸습니다.'
            });
            return socket.disconnect();
        }

        if(room.now_player == room.max_player) {
            socket.emit('msg', {
                'action': 'exit',
                'message': '방이 꽉 찼습니다.'
            });
            return socket.disconnect();
        }

        await Room.updateOne({ roomcode : url_query.room }, { $inc : { now_player : 1 } });
        app.get('socket_main').emit('msg', { 'action' : 'reload_room' });

        socket.join(`room_${url_query.room}`);
        socket.join(`user_${user.fullID}`);

        const already_user = await RoomUser.find({ roomcode : url_query.room });
        already_user.forEach(user => {
            socket.emit('userJoin', {
                nickname: user.nickname,
                fullID: user.fullID,
                verified: user.verified,
                badge: user.badge
            });
        });

        socket.emit('msg', {
            'action': 'keymapinfo',
            'key1': user.rhythm_key_1,
            'key2': user.rhythm_key_2,
            'key3': user.rhythm_key_3,
            'key4': user.rhythm_key_4,
            'key5': user.rhythm_key_5,
            'key6': user.rhythm_key_6,
            'key7': user.rhythm_key_7,
            'key8': user.rhythm_key_8,
            'show_accurary_center': user.show_accurary_center,
            'my_nick': user.nickname,
            'blocked_user': user.blocked_user || []
        });

        let badge;
        if(user.equip.image_badge != null) badge = await Item.findOne({ product_id : user.equip.image_badge });
        io.to(`room_${url_query.room}`).emit('userJoin', {
            nickname: user.nickname,
            fullID: user.fullID,
            verified: user.verified,
            badge: badge != null ? badge.image_name : null
        });
        io.to(`room_${url_query.room}`).emit('Chat', {
            nickname: `시스템`,
            chattype: 'system',
            chat: `<strong>${user.nickname}</strong>님이 입장하셨습니다.`,
            verified: true
        });
        await RoomUser.create({
            "nickname" : user.nickname,
            "fullID" : user.fullID,
            "verified": user.verified,
            "roomcode" : url_query.room,
            "socket_id": socket.id,
            "badge": badge != null ? badge.image_name : null
        });

        socket.emit('msg', {
            'action': 'roomInfo',
            'name': room.name,
            'password': room.password,
            'note_speed': room.note_speed,
            'music': room.music,
            'note': room.note_name,
            'startpos': room.startpos,
            'public': room.public,
            'pitch': room.pitch,
            'now_player': room.now_player,
            'max_player': room.max_player,
            'packet_multiplier': room.packet_multiplier
        });

        if(room.public) socket.emit('Chat', {
            nickname: `시스템`,
            chattype: 'system',
            chat: `신고 기능 작동을 위해 채팅이 최대 3일(신고 처리중일시 처리시까지 삭제 안됨) 로깅됩니다. 동의하지 않을 경우 채팅을 사용하지 마세요!`,
            verified: true
        });

        if(room.auto_manage_room && !room.auto_manage_room_timeout_setted) {
            auto_manage_interval = setInterval(async () => {
                const before_timestamp = timestamp;
                timestamp -= 1000;
                if(before_timestamp < 0) return;
                if(before_timestamp == 0) {
                    const players = await RoomUser.find({ roomcode : url_query.room });
                    await Room.updateOne({ roomcode : url_query.room , playing : true });
                    app.get('socket_main').emit('msg', { 'action' : 'reload_room' });
                    const checkroom = await Room.findOne({ roomcode : url_query.room });
                    return io.to(`room_${url_query.room}`).emit('msg', {
                        'action': 'gamestart',
                        'music': checkroom.music,
                        'create_mode': !checkroom.note,
                        'players': players,
                        'pitch': checkroom.pitch
                    });
                }
                if(before_timestamp == 30000) return io.to(`room_${url_query.room}`).emit('Chat', {
                    nickname: '시스템',
                    chattype: 'system',
                    chat: '30초 후 게임이 시작됩니다.',
                    verified: true
                });
                if(before_timestamp == 20000) return io.to(`room_${url_query.room}`).emit('Chat', {
                    nickname: '시스템',
                    chattype: 'system',
                    chat: '20초 후 게임이 시작됩니다.',
                    verified: true
                });
                if(before_timestamp <= 10000 && timestamp % 1000 == 0) return io.to(`room_${url_query.room}`).emit('Chat', {
                    nickname: '시스템',
                    chattype: 'system',
                    chat: `${timestamp / 1000}초 후 게임이 시작됩니다.`,
                    verified: true
                });
            }, 1000);
            await Room.updateOne({ roomcode : url_query.room }, { auto_manage_room_timeout_setted : true });
        }

        if(master) socket.emit('msg', { 'action' : 'im_master' });
        else socket.emit('msg', { 'action' : 'im_not_master' });

        if(room.room_for_replay) socket.emit('msg', {
            action: 'toggleinput'
        });

        socket.on('msg', async data => {
            let checkroom = await Room.findOne({ roomcode : url_query.room });
            switch(data.action) {
                case 'gamestart':
                    if(!master) return;
                    const players = await RoomUser.find({ roomcode : url_query.room });
                    let most_slow_note_speed = 1;
                    if(checkroom.note != null) for(let key in checkroom.note.jscode) {
                        if(!checkroom.note.jscode[key].split(' ').join('').startsWith('note_speed=note_speed/'))
                            continue;

                        const this_note_speed = Number(checkroom.note.jscode[key]
                            .split(' ').join('')
                            .replace('note_speed=note_speed/', ''));
                        if(!isNaN(this_note_speed) && this_note_speed > most_slow_note_speed)
                            most_slow_note_speed = this_note_speed;
                    }
                    await Room.updateOne({
                        roomcode : url_query.room,
                        playing : true,
                        note_speed: checkroom.note_speed * most_slow_note_speed,
                        packet_multiplier: most_slow_note_speed
                    });
                    const before_packet = checkroom.packet_multiplier;
                    checkroom = await Room.findOne({ roomcode : url_query.room });
                    if(before_packet != checkroom.packet_multiplier) socket.emit('Chat', {
                        nickname: '시스템',
                        chattype: 'system',
                        chat: '채보 이펙트로 인해 패킷 설정이 변경되었습니다.',
                        verified: true
                    });

                    io.to(`room_${url_query.room}`).emit('msg', {
                        action : 'roomInfo',
                        name : checkroom.name,
                        password : checkroom.password,
                        startpos : checkroom.startpos,
                        public : checkroom.public,
                        pitch: checkroom.pitch,
                        packet_multiplier: checkroom.packet_multiplier
                    });
                    io.to(`room_${url_query.room}`).emit('msg', {
                        'action': 'gamestart',
                        'music': checkroom.music,
                        'create_mode': !checkroom.note,
                        'players': players,
                        'pitch': checkroom.pitch
                    });

                    rtnote = {};
                    rtnote.music = checkroom.music;
                    rtnote.musicname = checkroom.music_name;
                    rtnote.author = user.fullID;
                    rtnote.author_name = user.nickname;
                    rtnote.note = {};
                    rtnote.note.note1 = [];
                    rtnote.note.note2 = [];
                    rtnote.note.note3 = [];
                    rtnote.note.note4 = [];
                    rtnote.note.note5 = [];
                    rtnote.note.note6 = [];
                    rtnote.note.note7 = [];
                    rtnote.note.note8 = [];

                    pitch = checkroom.pitch;
                    break;
                case 'gameready':
                    await Room.updateOne( { roomcode : url_query.room }, { $inc: { ready_player : 1 } } );
                    checkroom = await Room.findOne({ roomcode : url_query.room });

                    if(checkroom.ready_player >= checkroom.now_player || checkroom.now_player == 1) {
                        io.to(`room_${url_query.room}`).emit('msg', {
                            'action': 'gamestartreal',
                            'note_speed': checkroom.note_speed,
                            'musicname': checkroom.music_name,
                            'startpos': checkroom.startpos,
                            'countdown': !checkroom.room_for_note_test,
                            'now_player': checkroom.now_player,
                            'max_player': checkroom.max_player,
                            'password': checkroom.password
                        });
                        await Room.updateOne( { roomcode: url_query.room }, {
                            ready_player : 0,
                            starttimestamp: new Date().getTime() + 3000 - checkroom.startpos
                        });

                        if(checkroom.room_for_note_test) starttimestamp = new Date().getTime() - checkroom.startpos;
                        else starttimestamp = new Date().getTime() + 3000 - checkroom.startpos;

                        rtnote = {};
                        rtnote.music = checkroom.music;
                        rtnote.musicname = checkroom.music_name;
                        rtnote.author = user.fullID;
                        rtnote.author_name = user.nickname;
                        rtnote.note = {};
                        rtnote.note.note1 = [];
                        rtnote.note.note2 = [];
                        rtnote.note.note3 = [];
                        rtnote.note.note4 = [];
                        rtnote.note.note5 = [];
                        rtnote.note.note6 = [];
                        rtnote.note.note7 = [];
                        rtnote.note.note8 = [];

                        let countdown;
                        if(checkroom.room_for_note_test) countdown = 0;
                        else countdown = 3000;
                        if(checkroom.note != null) {
                            rtnote_timeout = [];
                            rtnote['jscode'] = checkroom.note.jscode;
                            for(let i in checkroom.note.note) {
                                checkroom['note']['note'][i].forEach(time => {
                                    if(time > checkroom.startpos) rtnote_timeout.push(setTimeout(() => {
                                        io.to(`room_${url_query.room}`).emit('GiveNote', {
                                            note: Number(i.replace('note', '')),
                                            note_speed: checkroom.note_speed
                                        });
                                        rtnote['note'][i].push(time);
                                    }, ((time / (checkroom.pitch / 100)) + countdown - (checkroom.startpos / (checkroom.pitch / 100)))));
                                });
                            }

                            if(checkroom.trusted) for(let i in checkroom.note.jscode) {
                                if(Number(i) > checkroom.startpos) rtnote_timeout.push(setTimeout(() => {
                                   io.to(`room_${url_query.room}`).emit('msg', {
                                       'action': 'eval',
                                       'message': checkroom['note']['jscode'][i]
                                           .split('/*grave*/').join('`')
                                           .split('/*openbracket*/').join('{')
                                           .split('/*closebracket*/').join('}')
                                           .split('/*bigcomma*/').join('"')
                                   });
                                }, ((Number(i) / (checkroom.pitch / 100)) + countdown - (checkroom.startpos / (checkroom.pitch / 100))) + checkroom.note_speed));
                                else setImmediate(() => {
                                    io.to(`room_${url_query.room}`).emit('msg', {
                                        'action': 'eval',
                                        'message': checkroom['note']['jscode'][i]
                                            .split('/*grave*/').join('`')
                                            .split('/*openbracket*/').join('{')
                                            .split('/*closebracket*/').join('}')
                                            .split('/*bigcomma*/').join('"')
                                    });
                                });
                            }

                            if(checkroom.note.chat != null && checkroom.trusted) for(let i in checkroom.note.chat) {
                                if(Number(i) > checkroom.startpos) rtnote_timeout.push(setTimeout(() => {
                                    io.to(`room_${url_query.room}`).emit('Chat', checkroom['note']['chat'][i]);
                                }, ((Number(i) / (checkroom.pitch / 100)) + countdown - (checkroom.startpos / (checkroom.pitch / 100))) + checkroom.note_speed));
                                else setImmediate(() => {
                                    io.to(`room_${url_query.room}`).emit('Chat', checkroom['note']['chat'][i]);
                                });
                            }
                        }

                        if(checkroom.autoplay) {
                            socket.emit('msg', {
                                'action': 'toggleautoplay'
                            });
                            socket.emit('Chat', {
                                nickname: '시스템',
                                chattype: 'system',
                                chat: '자동플레이가 활성화되었습니다.',
                                verified: true
                            });
                        }

                        io.to(`room_${checkroom.roomcode}`).emit('msg', {
                            "action": "eval",
                            "message": `note_speed = ${checkroom.note_speed / checkroom.packet_multiplier}`
                        });
                        await Room.updateOne({ roomcode : checkroom.roomcode }, {
                            note_speed: checkroom.note_speed / checkroom.packet_multiplier
                        });
                        app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                    }
                    break;
                case 'gameend':
                    if(master || room.auto_manage_room) {
                        let checkroom = await Room.findOne({ roomcode : url_query.room });
                        if(!checkroom.playing) return;

                        if(Date.now() - checkroom.starttimestamp > 60000 && !spectate) {
                            await User.updateOne({ fullID : user.fullID }, { $inc : { money : 10 } });
                            socket.emit('Chat', {
                                nickname: '시스템',
                                chattype: 'system',
                                chat: '게임을 1분 이상 플레이하여 10원을 획득하였습니다.',
                                verified: true
                            });
                        }

                        await Room.updateOne({ roomcode: url_query.room, playing: false });
                        app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                        if (master) io.to(`room_${url_query.room}`).emit('msg', {
                            'action': 'gameend',
                            rtnote
                        });
                        io.to(`room_${url_query.room}`).emit('msg', {
                            'action': 'spectate',
                            'value': false
                        });
                        spectate = false;

                        checkroom = await Room.findOne({ roomcode : url_query.room });

                        rtnote_timeout.forEach(timeout => {
                            clearTimeout(timeout);
                        });
                        rtnote_timeout = [];

                        if(checkroom.room_for_note_test) {
                            socket.emit('msg', {
                                "action": "redirect",
                                "url": `/editor?name=${checkroom.note_name_for_note_test}&startpos=${((new Date().getTime() - starttimestamp) - (1000 / (checkroom.pitch / 100))) / (checkroom.pitch / 100)}&pitch=${checkroom.pitch}&autoplay=${checkroom.autoplay}&unsafe=${checkroom.trusted}`
                            });
                        }
                        if(checkroom.room_for_single_play) {
                            socket.emit('msg', {
                                "action": "redirect",
                                "url": `/note`
                            });
                        }
                        if(checkroom.room_from_workshop) {
                            socket.emit('msg', {
                                "action": "redirect",
                                "url": `/workshop/note?name=${checkroom.note_name}`
                            });
                        }
                        if(checkroom.room_for_replay) {
                            socket.emit('msg', {
                                "action": "redirect",
                                "url": `/replay`
                            });
                        }
                        timestamp = 10000;
                    }
                    break;
                case 'stopspectate':
                    socket.leave(`spectate_${data.fullID}`);
                    socket.emit('msg', {
                        "action": "stopspectate"
                    });
                    break;
            }
        });

        socket.on('kickUser', async data => {
            if(master) {
                if(data.fullID == user.fullID) return socket.emit('msg', {
                    'action': 'alert',
                    'message': '자신을 킥할 수 없습니다.'
                });
                const kickuser = await RoomUser.findOne({ fullID : data.fullID });
                io.to(`user_${data.fullID}`).emit('msg', {
                    'action': 'exit',
                    'message': '방장에게 강퇴되었습니다.'
                });
                io.connected[kickuser.socket_id].disconnect();
                await RoomUser.deleteOne({ fullID : data.fullID });
            }
        });

        socket.on('SpectateUser', async data => {
            if(data.fullID == user.fullID) return socket.emit('msg', {
                'action': 'alert',
                'message': '자신을 관전할 수 없습니다.'
            });
            const checkroom = await Room.findOne({ roomcode : url_query.room });

            if(!checkroom.note && data.fullID == checkroom.master) return socket.emit('msg', {
                'action': 'alert',
                'message': '자유 모드에서는 방장을 관전할 수 없습니다.'
            });

            socket.join(`spectate_${data.fullID}`);
            socket.emit('msg', {
                'action': 'startspectate',
                'music': checkroom.music,
                'seek': Date.now() - checkroom.starttimestamp,
                'note_speed': checkroom.note_speed
            });

            if(checkroom.trusted) for(let i in checkroom.note.jscode) {
                if(Number(i) <= checkroom.startpos) setImmediate(() => {
                    socket.emit('msg', {
                        'action': 'eval',
                        'message': checkroom['note']['jscode'][i]
                            .split('/*grave*/').join('`')
                            .split('/*openbracket*/').join('{')
                            .split('/*closebracket*/').join('}')
                            .split('/*bigcomma*/').join('"')
                    });
                });
            }
        });

        socket.on('PressKey', data => {
            io.to(`spectate_${user.fullID}`).emit('msg', {
                action: 'spectate_presskey',
                note: data.note
            });
        });

        socket.on('ChangeRoomSetting', async data => {
            if(!master) return socket.emit('msg', { 'action' : 'alert' , 'message' : '권한이 없습니다.' });
            if(room.room_for_note_test || room.room_for_single_play || room.room_for_workshop || room.room_for_replay)
                return socket.emit('msg', { 'action' : 'alert' , 'message' : '권한이 없습니다.' });

            if(!data.name || !data.note_speed || !data.music || data.startpos < 0 || data.pitch < 50 || data.pitch > 400) return socket.emit('msg', { 'action' : 'alert' , 'message' : '설정 구성이 잘못되었습니다.' });

            let note;
            let note_file;
            let token_result;
            if(data.note != 'rhythmcraft_mode') {
                note = await File.findOne({ name : data.note , file_type : 'note' });
                if(!note) return socket.emit('msg', { 'action' : 'alert' , 'message' : '채보 선택이 잘못되었습니다.' });
                note_file = String(fs.readFileSync(path.join(setting.SAVE_FILE_PATH, note.name)));

                if(path.extname(note.name) == '.signedrhythmcraft') {
                    token_result = utils.verifyToken(note_file);
                    if (token_result.error) return socket.emit('msg', { 'action' : 'alert' , 'message' : `채보 오류 : ${token_result.message}` });
                }
                else note_file = JSON.parse(note_file);
            }

            const music = await File.findOne({ name : note != null ? (token_result != null ? token_result.music : note_file.music) : data.music , public : true , file_type : 'music' });

            if(!music) return socket.emit('msg', { 'action' : 'alert' , 'message' : '음악이 잘못되었습니다.' });

            await Room.updateOne({ roomcode : url_query.room }, {
                name : data.name,
                password : data.password,
                note_speed : data.note_speed,
                music : music.name,
                music_name : music.originalname,
                note: token_result || note_file,
                startpos: data.startpos,
                public: data.public,
                pitch: data.pitch,
                trusted: !token_result ? false : true,
                packet_multiplier: user.admin ? data.packet_multiplier : 1
            });
            app.get('socket_main').emit('msg', { 'action' : 'reload_room' });

            socket.emit('Chat', {
                nickname: '시스템',
                chattype: 'system',
                chat: '방장이 방 설정을 변경하였습니다.',
                verified: true
            });

            io.to(`room_${url_query.room}`).emit('msg', {
                action : 'roomInfo',
                name : data.name,
                password : data.password,
                note_speed : data.note_speed,
                music : music.name,
                note : data.note,
                startpos : data.startpos,
                public : data.public,
                pitch: data.pitch,
                packet_multiplier: user.admin ? data.packet_multiplier : 1
            });

            note_name = data.note;
            return;
        });

        socket.on('GiveNote', async data => {
            const room = await Room.findOne({ roomcode : url_query.room });

            if(master && !room.note) {
                let key;
                if(data.key == user.rhythm_key_1) key = 1;
                if(data.key == user.rhythm_key_2) key = 2;
                if(data.key == user.rhythm_key_3) key = 3;
                if(data.key == user.rhythm_key_4) key = 4;
                if(data.key == user.rhythm_key_5) key = 5;
                if(data.key == user.rhythm_key_6) key = 6;
                if(data.key == user.rhythm_key_7) key = 7;
                if(data.key == user.rhythm_key_8) key = 8;

                if(key != null) {
                    io.to(`room_${url_query.room}`).emit('GiveNote', {
                        note: key,
                        note_speed: room.note_speed
                    });

                    rtnote['note'][`note${key}`].push((new Date().getTime() - starttimestamp) * (pitch / 100));
                }
            }
        });

        socket.on('MyScore', data => {
            io.to(`room_${url_query.room}`).emit('MyScore', {
                nickname: user.nickname,
                score: data.score,
                accurary: data.accurary,
                max_combo: data.max_combo,
                verified: user.verified,
                rank: data.rank
            });

            const replay = rtnote;
            const replay_data = rtnote.jscode || {};
            for(let key in data.replay) {
                if(!data.replay[key] || typeof data.replay[key] != 'string') continue;
                replay_data[key] = `fakeKey('${data.replay[key].split('`').join('')}');`;
            }
            replay['replay'] = true;
            replay['chat'] = data.chat;
            delete replay.iss;
            delete replay.iat;
            const token = jwt.sign(replay, setting.TOKEN_SECRET, {
                issuer: setting.SERVER_NAME
            });
            socket.emit('Replay', {
                replay: token
            });
        });

        socket.on('Chat', async data => {
            const checkuser = await User.findOne({ fullID : user.fullID });
            const checkroom = await Room.findOne({ roomcode : url_query.room });

            if(checkroom.room_for_replay) return;

            let chattype;
            if(checkuser.admin) chattype = 'admin';
            else if(master) chattype = 'roomowner';
            else chattype = 'user';

            const params = data.chat.replace('/', '').split(' ');
            params.splice(0, 1);
            if(data.chat.startsWith('/') && checkuser.admin) switch(data.chat.replace('/', '').split(' ')[0]) {
                case 'debug':
                    switch(params[0]) {
                        case 'autoplay':
                            socket.emit('msg', {
                                'action': 'toggleautoplay'
                            });
                            socket.emit('Chat', {
                                nickname: '시스템',
                                chattype: 'system',
                                chat: '자동플레이 명령이 실행되었습니다.',
                                verified: true
                            });
                            break;
                        case 'notepersecond':
                            if(!params[1] || !params[2]) {
                                socket.emit('Chat', {
                                    nickname: '시스템',
                                    chattype: 'system',
                                    chat: '옵션이 잘못되었습니다.<br>사용법 : /debug notepersecond <노트번호> <간격 ms>',
                                    verified: true
                                });
                                break;
                            }

                            notepersecond = setInterval(() => {
                                io.to(`room_${url_query.room}`).emit('GiveNote', {
                                    note: Number(params[1]),
                                    note_speed: checkroom.note_speed
                                });
                            }, Number(params[2]));
                            socket.emit('Chat', {
                                nickname: '시스템',
                                chattype: 'system',
                                chat: `${params[1]}번 노트가 ${params[2]}ms마다 생성됩니다.`,
                                verified: true
                            });
                            break;
                        case 'stopnote':
                            clearTimeout(notepersecond);
                            rtnote_timeout.forEach(timeout => {
                                clearTimeout(timeout);
                            });
                            rtnote_timeout = [];
                            socket.emit('Chat', {
                                nickname: '시스템',
                                chattype: 'system',
                                chat: '모든 노트 대기열을 정지했습니다.',
                                verified: true
                            });
                            break;
                        default:
                            socket.emit('Chat', {
                                nickname: '시스템',
                                chattype: 'system',
                                chat: '존재하지 않는 디버그 옵션입니다.',
                                verified: true
                            });
                            break;
                    }
                    break;
                case 'closeroom':
                    const all_user = await RoomUser.find({ roomcode : url_query.room });
                    io.to(`room_${url_query.room}`).emit('msg', { 'action' : 'exit' , 'message' : '관리자에 의해 방이 삭제됩니다.' });
                    all_user.forEach(u => {
                        io.connected[u.socket_id].disconnect();
                    });

                    await RoomUser.deleteMany({ roomcode : url_query.room });
                    await Room.deleteOne({ roomcode : url_query.room });
                    app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                    break;
                case 'packet':
                    const p_params = data.chat.replace('/packet ', '').split('//');
                    if(p_params.length != 3) {
                        socket.emit('Chat', {
                            nickname: '시스템',
                            chattype: 'system',
                            chat: '파라미터 수가 잘못되었습니다. 소켓 대상, 이벤트, 메시지를 //로 구분하여 입력해주세요.',
                            verified: true
                        });
                        break;
                    }
                    let packet_data;
                    try {
                        packet_data = JSON.parse(p_params[2]);
                    } catch(e) {
                        packet_data = p_params[2];
                    }
                    io.to(p_params[0]).emit(p_params[1], packet_data);
                    socket.emit('Chat', {
                        nickname: '시스템',
                        chattype: 'system',
                        chat: '패킷을 전송하였습니다.',
                        verified: true
                    });
                    break;
                case 'roominfo':
                    if(params.length != 1) {
                        socket.emit('Chat', {
                            nickname: '시스템',
                            chattype: 'system',
                            chat: JSON.stringify(checkroom),
                            verified: true
                        });
                        break;
                    }
                    if(!checkroom[params[0]]) {
                        socket.emit('Chat', {
                            nickname: '시스템',
                            chattype: 'system',
                            chat: '해당 값이 존재하지 않습니다.',
                            verified: true
                        });
                        break;
                    }
                    socket.emit('Chat', {
                        nickname: '시스템',
                        chattype: 'system',
                        chat: checkroom[params[0]].toString(),
                        verified: true
                    });
                    break;
                case 'list':
                    const users = await RoomUser.find({ roomcode : url_query.room });
                    let msg = '';
                    users.forEach(u => {
                        msg += `${u.nickname} : ${u.fullID}<br>`;
                    });
                    socket.emit('Chat', {
                        nickname: '시스템',
                        chattype: 'system',
                        chat: msg,
                        verified: true
                    });
                    break;
                default:
                    socket.emit('Chat', {
                        nickname: '시스템',
                        chattype: 'system',
                        chat: '존재하지 않는 명령어입니다.',
                        verified: true
                    });
            }

            if(data.chat.startsWith('/') && checkuser.admin) return;

            if(checkuser.block_chat >= Date.now()) return socket.emit('Chat', {
                nickname: `시스템`,
                chattype: 'system',
                chat: `관리자에 의해 채팅이 정지되어 ${new Date(checkuser.block_chat).toLocaleDateString()} ${new Date(checkuser.block_chat).toLocaleTimeString()}까지 채팅 사용이 불가능합니다.<br>채팅 정지 사유 : ${checkuser.block_chat_reason || '사유가 지정되지 않음'}`,
                verified: true
            });

            const chat_id = uniqueString();
            if(checkroom.public) {
                for (const w of ko_bad) {
                    if(data.chat.includes(w)) {
                        socket.emit('Chat', {
                            nickname: `시스템`,
                            chattype: 'system',
                            chat: `채팅에 부적절한 단어가 포함되어 전송되지 않았습니다.`,
                            verified: true
                        });
                        const d = new Date();
                        d.setMinutes(d.getMinutes() + 5);

                        await User.updateOne({ fullID : checkuser.fullID }, {
                            block_chat: d.getTime(),
                            block_chat_reason: '채팅에 부적절한 언어 사용'
                        });
                        return;
                    }
                }
                await Chat.create({
                    fullID: checkuser.fullID,
                    text: data.chat,
                    chat_id
                });
            }
            let badge;
            if(checkuser.equip.image_badge != null) badge = await Item.findOne({ product_id : checkuser.equip.image_badge });
            io.to(`room_${url_query.room}`).emit('Chat', {
                nickname: checkuser.nickname,
                chattype,
                chat: data.chat,
                verified: checkuser.verified,
                chat_id,
                badge: badge != null ? badge.image_name : null,
                fullID: checkuser.fullID
            });
        });

        socket.on('SaveToLibrary', async data => {
            const name = `${uniqueString()}.rhythmcraft`;
            fs.writeFileSync(path.join(setting.SAVE_FILE_PATH, name), data.rtnote);

            await File.create({
                name,
                originalname: data.filename,
                owner: user.fullID,
                file_type: 'note',
                description: '레벨에 대해 말해보세요!'
            });

            socket.emit('msg', { 'action' : 'updatenote' });
            return socket.emit('msg', { 'action' : 'alert' , 'message' : `채보 ${data.filename}이(가) 성공적으로 업로드되었습니다.` });
        });
        
        socket.on('ScoreUpdate', data => {
            io.to(`room_${url_query.room}`).emit('ScoreUpdate', {
                fullID : user.fullID,
                score: data.score,
                accurary: data.accurary,
                combo: data.combo,
                max_combo: data.max_combo
            });
        });

        socket.on('Invite', async data => {
            if(!user.friends.includes(data.user)) return socket.emit('msg', {
                action: 'alert',
                message: '해당 유저는 친구가 아닙니다.'
            });

            const check_roomuser = await RoomUser.findOne({ fullID : data.user , roomcode : url_query.room });
            if(check_roomuser != null) return socket.emit('msg', {
                action: 'alert',
                message: '해당 유저가 이미 같은 게임에 있습니다.'
            });

            const invite_user = await User.findOne({ fullID : data.user });
            if(!invite_user) return socket.emit('msg', {
                action: 'alert',
                message: '해당 유저가 존재하지 않습니다.'
            });
            if(!invite_user.online) return socket.emit('msg', {
                action: 'alert',
                message: '해당 유저가 오프라인입니다.'
            });

            const checkroom = await Room.findOne({ roomcode : url_query.room });

            let avatar = await File.findOne({ owner : user.fullID, file_type : 'avatar' });
            if (!avatar) avatar = '/img/no_avatar.png';
            else avatar = `/avatar/${avatar.name}`;

            app.get('socket_friend').to(`user_${data.user}`).emit('toast', {
                image: avatar,
                title: '게임 초대',
                text: `${utils.escapeHTML(user.nickname)}님이 "${utils.escapeHTML(checkroom.name)}" 게임에 초대하였습니다.<br>아래 버튼으로 참가하세요.<br>`
                + `<a href="/game?room=${checkroom.roomcode}#pwu=${encodeURIComponent(checkroom.password || 'nopassword')}" class="btn btn-primary">참가</a>`,
                options: {
                    delay: 10000
                },
                allow_html: true
            });
        });

        socket.on('disconnect', async () => {
            await RoomUser.deleteOne({ fullID : user.fullID });
            if(master) {
                const all_user = await RoomUser.find({ roomcode : url_query.room });
                await Room.deleteOne({ roomcode : url_query.room });
                app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                io.to(`room_${url_query.room}`).emit('msg', { 'action' : 'exit' , 'message' : '방장이 나갔습니다. 방이 삭제됩니다.' });
                all_user.forEach(u => {
                    io.connected[u.socket_id].disconnect();
                });
            }
            else {
                await Room.updateOne( { roomcode: url_query.room }, { $inc: { now_player: -1 } } );
                let checkroom = await Room.findOne({ roomcode : url_query.room });
                app.get('socket_main').emit('msg', { 'action' : 'reload_room' });
                io.to(`room_${url_query.room}`).emit('userLeave', { 'nickname' : user.nickname , 'fullID' : user.fullID });
                io.to(`room_${url_query.room}`).emit('Chat', {
                    nickname: `시스템`,
                    chattype: 'system',
                    chat: `<strong>${user.nickname}</strong>님이 퇴장하셨습니다.`,
                    verified: true
                });

                // if(checkroom.now_player == 0) {
                //     await Room.deleteOne({ roomcode : url_query.room });
                //     app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                //     await CreateOfficialRoom();
                //     app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                // }
            }
        });
    });
}

async function CreateOfficialRoom() {
    const count = await File.countDocuments({ public : true , file_type : 'note' });
    const note = await File.findOne({ public : true , file_type : 'note' }).skip(utils.getRandomInt(0, count - 1));

    let token_result;
    let note_file = String(fs.readFileSync(path.join(setting.SAVE_FILE_PATH, note.name)));
    if(path.extname(note.name) == '.signedrhythmcraft') {
        token_result = utils.verifyToken(note_file);
        if (token_result.error) return CreateOfficialRoom();
    }
    else note_file = JSON.parse(note_file);

    const music = await File.findOne({ name : token_result != null ? token_result.music : note_file.music , public : true , file_type : 'music' });
    if(!music) return CreateOfficialRoom();

    await Room.create({
        name: "자동 진행 공식 방",
        master: "no_master",
        note_speed: 1000,
        max_player: 100,
        roomcode: `official_${uniqueString()}`,
        music: music.name,
        music_name: music.originalname,
        note: token_result || note_file,
        trusted: token_result != null,
        auto_manage_room: true
    });
}