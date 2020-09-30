const Url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const uniqueString = require('unique-string');

const User = require('../schemas/user');
const Room = require('../schemas/room');
const RoomUser = require('../schemas/room_user');
const File = require('../schemas/file');

const setting = require('../setting.json');

module.exports = (io, app) => {
    io.on('connection', async socket => {
        const user = await User.findOne({ fullID : socket.request.session.passport.user.fullID });
        const url = Url.parse(socket.request.headers.referer);
        const url_query = querystring.parse(url.query);
        const socket_url = Url.parse(socket.request.url);
        const socket_url_query = querystring.parse(socket_url.query);
        const room = await Room.findOne({ roomcode : url_query.room });
        let rtnote = {};
        let starttimestamp;
        let rtnote_timeout = [];

        io.to(`user_${user.fullID}`).emit('msg', { 'action' : 'exit' , 'message' : '다중접속' });

        let master = false;
        if(room.master == user.fullID) {
            master = true;
            socket.emit('msg', { 'action' : 'im_master' });
        }

        if(room.playing) {
            socket.emit('msg', {
                'action' : 'exit',
                'message' : '게임이 플레이 중 입니다.'
            });
            return socket.disconnect();
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

        if(!room) {
            socket.emit('msg', {
                'action' : 'exit',
                'message' : '해당 방이 존재하지 않습니다.\n서버가 재시작되었을 수 있습니다.'
            });
            return socket.disconnect();
        }

        socket.join(`room_${url_query.room}`);
        socket.join(`user_${user.fullID}`);

        const already_user = await RoomUser.find({ roomcode : url_query.room });
        already_user.forEach(user => {
            socket.emit('userJoin', user);
        });

        io.to(`room_${url_query.room}`).emit('userJoin', { "nickname" : user.nickname , "fullID" : user.fullID });
        io.to(`room_${url_query.room}`).emit('Chat', {
            nickname: `시스템`,
            chattype: 'system',
            chat: `<strong>${user.nickname}</strong>님이 입장하셨습니다.`
        });
        await RoomUser.create({ "nickname" : user.nickname , "fullID" : user.fullID , "roomcode" : url_query.room });

        socket.emit('msg', {
            'action': 'roomInfo',
            'name': room.name,
            'password': room.password,
            'note_speed': room.note_speed,
            'music': room.music
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
            'key8': user.rhythm_key_8
        });

        socket.on('msg', async data => {
            let checkroom = await Room.findOne({ roomcode : url_query.room });
            switch(data.action) {
                case 'gamestart':
                    const players = await RoomUser.find({ roomcode : url_query.room });
                    await Room.updateOne({ roomcode : url_query.room , playing : true });
                    app.get('socket_main').emit('msg', { 'action' : 'reload_room' });
                    if(master) io.to(`room_${url_query.room}`).emit('msg', {
                        'action': 'gamestart',
                        'music': checkroom.music,
                        'create_mode': !checkroom.note,
                        players: players
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
                    break;
                case 'gameready':
                    await Room.updateOne( { roomcode : url_query.room }, { $inc: { ready_player : 1 } } );
                    checkroom = await Room.findOne({ roomcode : url_query.room });

                    if(checkroom.ready_player == checkroom.now_player) {
                        io.to(`room_${url_query.room}`).emit('msg', {
                            'action': 'gamestartreal',
                            'note_speed': checkroom.note_speed,
                            'musicname': checkroom.music_name
                        });
                        await Room.updateOne( { roomcode: url_query.room }, { ready_player : 0 } );

                        starttimestamp = new Date().getTime();

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

                        if(checkroom.note != null) {
                            rtnote_timeout = [];
                            for(let i in checkroom.note.note) {
                                checkroom['note']['note'][i].forEach(time => {
                                    rtnote_timeout.push(setTimeout(() => {
                                        io.to(`room_${url_query.room}`).emit('GiveNote', {
                                            note: Number(i.replace('note', '')),
                                            note_speed: checkroom.note_speed
                                        });
                                    }, time + 3000));
                                });
                            }
                        }
                    }
                    break;
                case 'gameend':
                    if(master) {
                        await Room.updateOne({ roomcode: url_query.room, playing: false });
                        app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                        if (master) io.to(`room_${url_query.room}`).emit('msg', {
                            'action': 'gameend',
                            rtnote
                        });

                        let checkroom = await Room.findOne({ roomcode : url_query.room });

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

                        rtnote_timeout.forEach(timeout => {
                            clearTimeout(timeout);
                        });
                        rtnote_timeout = [];
                    }
                    break;
            }
        });

        socket.on('kickUser', async data => {
            if(master) {
                io.to(`user_${data.fullID}`).emit('msg', {
                    'action': 'exit',
                    'message': '방장에게 강퇴되었습니다.'
                });
                await RoomUser.deleteOne({ fullID : data.fullID });
            }
        });

        socket.on('ChangeRoomSetting', async data => {
            if(!master) return socket.emit('msg', { 'action' : 'alert' , 'message' : '권한이 없습니다.' });
            if(!data.name || !data.note_speed || !data.music) return socket.emit('msg', { 'action' : 'alert' , 'message' : '설정 구성이 잘못되었습니다.' });

            let note;
            let note_file;
            if(data.note != 'rhythmcraft_mode') {
                note = await File.findOne({ name : data.note , file_type : 'note' });
                if(!note) return socket.emit('msg', { 'action' : 'alert' , 'message' : '채보 선택이 잘못되었습니다.' });
                note_file = JSON.parse(fs.readFileSync(path.join(setting.SAVE_FILE_PATH, note.name)));
            }

            const music = await File.findOne({ name : note != null ? note_file.music : data.music , public : true , file_type : 'music' });

            if(!music) return socket.emit('msg', { 'action' : 'alert' , 'message' : '음악이 잘못되었습니다.' });

            await Room.updateOne({ roomcode : url_query.room }, {
                name : data.name,
                password : data.password,
                note_speed : data.note_speed,
                music : music.name,
                music_name : music.originalname,
                note: note_file
            });
            app.get('socket_main').emit('msg', { 'action' : 'reload_room' });
            if(data.show_alert) socket.emit('msg', { 'action' : 'alert' , 'message' : '방 설정이 적용되었습니다.' });
            return;
        });

        socket.on('GiveNote', async data => {
            const room = await Room.findOne({ roomcode : url_query.room });

            if(master) {
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

                    rtnote['note'][`note${key}`].push(new Date().getTime() - starttimestamp);
                }
            }
        });

        socket.on('MyScore', data => {
            io.to(`room_${url_query.room}`).emit('MyScore', {
                nickname: user.nickname,
                score: data.score,
                accurary: data.accurary,
                max_combo: data.max_combo
            });
        });

        socket.on('Chat', data => {
            let chattype;
            if(user.admin) chattype = 'admin';
            else if(master) chattype = 'roomowner';
            else chattype = 'user';
            io.to(`room_${url_query.room}`).emit('Chat', {
                nickname: user.nickname,
                chattype,
                chat: data.chat
            });
        });

        socket.on('SaveToLibrary', async data => {
            const name = `${uniqueString()}.adofai`;
            fs.writeFileSync(path.join(setting.SAVE_FILE_PATH, name), data.rtnote);

            await File.create({
                name,
                originalname: data.filename,
                owner: user.fullID,
                file_type: 'note'
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

        socket.on('disconnect', async () => {
            await RoomUser.deleteOne({ fullID : user.fullID });
            if(master) {
                await Room.deleteOne({ roomcode : url_query.room });
                app.get('socket_main').emit('msg', { 'action': 'reload_room' });
                io.to(`room_${url_query.room}`).emit('msg', { 'action' : 'exit' , 'message' : '방장이 나갔습니다. 방이 삭제됩니다.' });
            }
            else {
                await Room.updateOne( { roomcode: url_query.room }, { $inc: { now_player: -1 } } );
                app.get('socket_main').emit('msg', { 'action' : 'reload_room' });
                io.to(`room_${url_query.room}`).emit('userLeave', { 'nickname' : user.nickname , 'fullID' : user.fullID });
                io.to(`room_${url_query.room}`).emit('Chat', {
                    nickname: `시스템`,
                    chattype: 'system',
                    chat: `<strong>${user.nickname}</strong>님이 퇴장하셨습니다.`
                });
            }
        });
    });
}