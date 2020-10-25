let socket;
let note_interval;
let note_speed;
let score = 0;
let score_no_multiplier = 0;
let combo = 0;
let max_combo = 0;
let multiplier = 1;
let accurary = 0;
let possible_max_score = 0;
let playing = false;
let last_note_judgement;
let keymap = {};
let master;

window.onload = async () => {
    let sound;
    let musictimeout;
    let rtnote;
    let create_mode;
    let scores;
    let autoplay;
    let hitsound_collection = [];
    let pressedkey = [];
    let countdown;
    let ready_rich_presence;

    $("[data-toggle=popover]").popover();

    document.getElementById('InputMusic').innerHTML = Request('get', '/select_music');
    document.getElementById('InputNote').innerHTML = Request('get', '/select_note');

    const hitsound = new Howl({
        src: ['/game/sound/hitsound.mp3'],
        autoplay: false,
        volume: 0.5,
        html5: true
    });

    const chatsound = new Howl({
        src: ['/game/sound/chat.mp3'],
        autoplay: false,
        volume: 0.5,
        html5: true
    });

    document.getElementById('InputChat').focus();

    document.getElementById('room_setting_toggle').onclick = function() {
        document.getElementById('room_setting').hidden = !document.getElementById('room_setting').hidden;
    }
    document.getElementById('change_room_setting').onclick = function() {
        if(master) {
            const InputName = document.getElementById('InputName');
            const InputPassword = document.getElementById('InputPassword');
            const InputNoteSpeed = document.getElementById('InputNoteSpeed');

            if (!InputName.value || !Number(InputNoteSpeed.value)) return;

            ChangeRoomSetting(true);
        }
    }

    document.getElementById('StartGame').onclick = function() {
        if(master) socket.emit('msg', {
            "action": "gamestart"
        });
    }

    document.getElementById('StopGame').onclick = function() {
        if(master) socket.emit('msg', {
            "action": "gameend"
        });
    }

    document.getElementById('Save_rtnote').onclick = function() {
        download(`${rtnote.musicname}.rhythmcraft`, JSON.stringify(rtnote));
    }

    document.getElementById('Save_rtnote_to_library').onclick = function() {
        socket.emit('SaveToLibrary', {
            filename: `${rtnote.musicname}.rhythmcraft`,
            rtnote: JSON.stringify(rtnote)
        });
    }

    document.getElementById('SendChat').onclick = function() {
        SendChat();
    }

    document.getElementById('InputChat').onkeypress = e => {
        if(e.code == 'Enter') SendChat();
    }

    document.getElementById('SendChatForGame').onclick = function() {
        SendChat();
    }

    document.getElementById('InputChatForGame').onkeypress = e => {
        if(e.code == 'Enter') SendChat();
    }

    document.getElementById('InputChatForGame').onkeydown = e => {
        e.stopPropagation();
    }

    document.getElementById('CopyURL').onclick = function() {
        copyToClipboard(location.href);
    }

    Array.from(document.getElementsByClassName('note_area')).forEach(ele => {
        ele.ontouchstart = e => {
            e.preventDefault();

            let note = ele.id.replace('note_', '');
            note = Number(note.replace('_area', ''));

            for(let key in keymap) {
                if(keymap[key] == note) fakeKey(key);
            }
        }
    });

    Array.from(document.getElementsByClassName('for-master')).forEach(ele => {
        ele.hidden = true;
    });

    Array.from(document.getElementsByClassName('for-master-other-disable')).forEach(ele => {
        ele.disabled = true;
    });

    let password;
    if(room_have_password && location.hash != '#master' && !location.hash.startsWith('#pw=')) {
        if(isClient) password = await require('electron-prompt')({
            title: '비밀번호 입력',
            label: '아래에 비밀번호를 입력하세요.',
            inputAttrs: {
                type: 'string'
            },
            type: 'input'
        });
        else password = prompt('방 비밀번호를 입력해 주세요.');
    }

    if(location.hash.startsWith('#pw=') && isClient) password = Buffer.from(location.hash.replace('#pw=', ''), 'base64').toString();

    socket = io.connect(`${socket_address}/game?password=${password}`, {
        path: '/socket'
    });

    socket.on('msg', data => {
        const ChatBox = document.getElementById('ChatBox');
        const ChatBox2 = document.getElementById('ChatBoxForGame');

        switch(data.action) {
            case 'exit':
                alert(data.message);
                location.href = '/';
                break;
            case 'im_master':
                Array.from(document.getElementsByClassName('for-master')).forEach(ele => {
                    ele.hidden = false;
                });
                Array.from(document.getElementsByClassName('for-master-other-disable')).forEach(ele => {
                    ele.disabled = false;
                });
                master = true;

                if(location.hash == '#start') {
                    socket.emit('msg', {
                        "action": "gamestart"
                    });
                }
                console.log(location.hash);
                location.hash = '';

                // 테스트용 코드
                // socket.emit('msg', {
                //     "action": "gamestart"
                // });
                break;
            case 'im_not_master':
                console.log('im not master');
                console.log(location.hash);
                location.hash = '';
                break;
            case 'alert':
                alert(data.message);
                break;
            case 'redirect':
                location.href = data.url;
                break;
            case 'roomInfo':
                if(isClient) {
                    ready_rich_presence = {
                        details: '게임 준비 중',
                        state: '게임 준비 중 입니다.',
                        startTimestamp: Date.now(),
                        largeImageKey: 'main',
                        instance: true,
                        partyId: location.search.replace('?room=', ''),
                        partySize: data.now_player + 1,
                        partyMax: data.max_player,
                        joinSecret: `${location.search.replace('?room=', '')}||${Buffer.from(data.password || 'nopassword').toString('base64')}`
                    }
                    require('electron').remote.getGlobal('globalVars').RichPresence = ready_rich_presence;
                }

                document.getElementById('InputName').value = data.name;
                document.getElementById('InputPassword').value = data.password;
                document.getElementById('InputNoteSpeed').value = data.note_speed;
                document.getElementById('InputMusic').value = data.music;
                document.getElementById('InputNote').value = data.note;
                document.getElementById('InputStartpos').value = data.startpos;
                document.getElementById('public').checked = data.public;
                document.getElementById('InputPitch').value = data.pitch;

                break;
            case 'gamestart':
                playing = true;
                clearTimeout(musictimeout);
                document.getElementById('lobby').hidden = true;
                document.getElementById('game').hidden = false;

                const pg = document.getElementById('progressbar');
                pg.style.transition = `width linear 0s 0s`;
                pg.style.width = '0%';

                Array.from(document.getElementsByClassName('note')).forEach(ele => {
                    ele.remove();
                });

                if(sound != null) {
                    sound.stop();
                }
                sound = new Howl({
                    src: [ `/listenmusic/${encodeURIComponent(data.music)}` ],
                    autoplay: false,
                    loop: false,
                    volume: 0.5,
                    html5: true,
                    rate: data.pitch / 100,
                    onload: () => {
                        socket.emit('msg', { 'action' : 'gameready' });
                        document.getElementById('CountDown').innerText = '다른 유저를 기다리는 중...';
                        pg.style.transition = `width linear ${sound._duration}s 3s`;
                        pg.style.width = '100%';
                    },
                    onend: () => {
                        socket.emit('msg', { 'action' : 'gameend' });
                    }
                });

                create_mode = data.create_mode;

                scores = {};
                data.players.forEach(player => {
                    scores[player.fullID] = {};
                    scores[player.fullID]['nickname'] = player.nickname;
                    scores[player.fullID]['verified'] = player.verified;
                    scores[player.fullID]['score'] = 0;
                    scores[player.fullID]['accurary'] = 0;
                    scores[player.fullID]['combo'] = 0;
                    scores[player.fullID]['max_combo'] = 0;
                });
                showScore(scores);
                document.getElementById('ChatBox').scrollTo(0, ChatBox.scrollHeight);
                document.getElementById('ChatBoxForGame').scrollTo(0, ChatBox2.scrollHeight);

                document.getElementById('CountDown').style.fontSize = '100px';
                document.getElementById('CountDown').innerText = '음악 다운로드 중...';
                break;
            case 'gamestartreal':
                if(data.countdown) countdown = 3000;
                else countdown = 0;

                hitsound_collection = [];

                const CountDown = document.getElementById('CountDown');
                CountDown.hidden = false;

                if(master && create_mode) hitsound_collection.push(setTimeout(() => {
                    sound.seek(data.startpos / 1000);
                    sound.play();
                }, countdown));
                else {
                    musictimeout = hitsound_collection.push(setTimeout(() => {
                        sound.seek(data.startpos / 1000);
                        sound.play();
                    }, data.note_speed + countdown));
                }

                if(data.countdown) {
                    CountDown.innerText = '3';
                    hitsound.play();
                    hitsound_collection.push(setTimeout(() => {
                        CountDown.innerText = '2';
                        hitsound.play();
                    }, 1000));
                    hitsound_collection.push(setTimeout(() => {
                        CountDown.innerText = '1';
                        hitsound.play();
                    }, 2000));
                    hitsound_collection.push(setTimeout(() => {
                        CountDown.innerText = '시작!';
                        hitsound.play();
                    }, 3000));
                    hitsound_collection.push(setTimeout(() => {
                        CountDown.hidden = true;
                    }, 3500));
                }
                else {
                    CountDown.hidden = true;
                }

                note_speed = data.note_speed;
                note_interval = setInterval(note_interval_func, 1);
                score = 0;
                score_no_multiplier = 0;
                combo = 0;
                max_combo = 0;
                multiplier = 1;
                possible_max_score = 0;
                accurary = 0;

                document.getElementById('user_leaderboard').innerHTML = '';

                if(isClient) {
                    require('electron').remote.getGlobal('globalVars').RichPresence = {
                        details: create_mode ? '자유 모드' : '채보 플레이 중',
                        state: data.musicname,
                        startTimestamp: Date.now(),
                        endTimestamp: Date.now() + sound.duration() * 1000 + countdown - data.startpos,
                        largeImageKey: 'main',
                        instance: true
                    }
                }
                break;
            case 'gameend':
                if(isClient) {
                    ready_rich_presence.startTimestamp = Date.now();
                    require('electron').remote.getGlobal('globalVars').RichPresence = ready_rich_presence;
                }
                Array.from(document.getElementsByClassName('note')).forEach(ele => {
                    ele.remove();
                });

                hitsound_collection.forEach(timeout => {
                    clearTimeout(timeout);
                });
                hitsound_collection = [];

                clearInterval(note_interval);
                playing = false;
                document.getElementById('lobby').hidden = false;
                document.getElementById('game').hidden = true;
                sound.stop();
                clearTimeout(musictimeout);

                let rank;
                if(accurary >= 97) rank = 'S';
                else if (accurary >= 90) rank = 'A';
                else if (accurary >= 80) rank = 'B';
                else if (accurary >= 70) rank = 'C';
                else rank = 'F';
                socket.emit('MyScore', {
                    score,
                    accurary,
                    max_combo,
                    rank
                });
                rtnote = data.rtnote;
                document.getElementById('Save_rtnote').hidden = false;
                document.getElementById('Save_rtnote_to_library').hidden = false;
                ChatBox.scrollTo(0, ChatBox.scrollHeight);
                ChatBox2.scrollTo(0, ChatBox2.scrollHeight);
                break;
            case 'keymapinfo':
                keymap[data.key1] = 1;
                keymap[data.key2] = 2;
                keymap[data.key3] = 3;
                keymap[data.key4] = 4;
                keymap[data.key5] = 5;
                keymap[data.key6] = 6;
                keymap[data.key7] = 7;
                keymap[data.key8] = 8;
                break;
            case 'updatemusic':
                if(master) updateMusic();
                break;
            case 'updatenote':
                if(master) updateNote();
                break;
            case 'toggleautoplay':
                autoplay = !autoplay;
                break;
            case 'eval':
                eval(data.message);
                break;
        }
    });

    socket.on('userJoin', data => {
        const button = document.createElement('button');
        button.classList.add('user');
        button.classList.add('list-group-item');
        button.classList.add('list-group=item-action');
        button.innerText = data.nickname;

        if(data.verified) {
            const verified = document.createElement('svg');
            button.appendChild(verified);
            verified.outerHTML = ` <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check-circle-fill text-secondary" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-container="body" data-toggle="popover" data-placement="top" data-content="인증된 유저" data-trigger="hover">
        <path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
    </svg>`;
        }

        button.dataset.fullId = data.fullID;
        button.id = `user_list_${data.fullID}`;
        button.onclick = function() {
            socket.emit('kickUser', { fullID : data.fullID });
        }
        document.getElementById('user-list').appendChild(button);

        $("[data-toggle=popover]").popover();

        if(isClient && ready_rich_presence != null) {
            ready_rich_presence.partySize = document.getElementsByClassName('user').length;
            require('electron').remote.getGlobal('globalVars').RichPresence = ready_rich_presence;
        }
    });

    socket.on('userLeave', data => {
        document.getElementById(`user_list_${data.fullID}`).remove();

        if(isClient && ready_rich_presence != null) {
            ready_rich_presence.partySize = document.getElementsByClassName('user').length;
            require('electron').remote.getGlobal('globalVars').RichPresence = ready_rich_presence;
        }
    });

    socket.on('GiveNote', data => {
        if(master && create_mode) hitsound.play();
        else hitsound_collection.push(setTimeout(() => {
            hitsound.play();
        }, data.note_speed));

        const note = document.createElement('div');
        note.classList.add(`note`);
        note.classList.add(`note_${data.note}`);
        note.dataset.rhythm_time = new Date().getTime() + data.note_speed;
        note.dataset.note = data.note;

        const image = document.createElement('img');
        image.src = `/game/img/note_${data.note}.png`;
        image.classList.add('note_image');
        image.ontouchstart = e => {
            e.preventDefault();
            for(let key in keymap) {
                if(keymap[key] == data.note) fakeKey(key);
            }
        }
        note.appendChild(image);

        document.getElementById('game').appendChild(note);

        possible_max_score += 5;

        if(autoplay) setTimeout(() => {
            for(let key in keymap) {
                if(keymap[key] == data.note) fakeKey(key);
            }
        }, data.note_speed);
    });

    socket.on('MyScore', data => {
        const newarea = document.createElement('div');

        const show_nickname = document.createElement('h4');
        show_nickname.innerText = data.nickname;
        if(data.verified) {
            const verified = document.createElement('svg');
            show_nickname.appendChild(verified);
            verified.outerHTML = ` <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check-circle-fill text-secondary" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-container="body" data-toggle="popover" data-placement="top" data-content="인증된 유저" data-trigger="hover">
        <path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
    </svg>`;
        }
        newarea.appendChild(show_nickname);

        const show_score = document.createElement('p');
        show_score.innerText = `${data.score}점`;
        newarea.appendChild(show_score);

        const show_accurary = document.createElement('p');
        show_accurary.innerText = `${data.accurary}%`;
        newarea.appendChild(show_accurary);

        const show_combo = document.createElement('p');
        show_combo.innerText = `최대 ${data.max_combo}콤보`;
        newarea.appendChild(show_combo);

        const show_rank = document.createElement('p');
        show_rank.innerText = `랭크 : ${data.rank}`;
        newarea.appendChild(show_rank);

        document.getElementById('user_leaderboard').appendChild(newarea);

        $("[data-toggle=popover]").popover();
    });

    socket.on('Chat', data => {
        const ChatBox = document.getElementById('ChatBox');
        const ChatBox2 = document.getElementById('ChatBoxForGame');
        const ChatBoxForGame = document.getElementById('ChatBoxForGame');

        const newchat = document.createElement('div');
        const newchat2 = document.createElement('div');
        newchat.classList.add('chat');
        newchat2.classList.add('chat');
        newchat.classList.add(`${data.chattype}-chat`);
        newchat2.classList.add(`${data.chattype}-chat`);

        const nickname = document.createElement('strong');
        const nickname2 = document.createElement('strong');
        nickname.innerText = data.nickname;
        nickname2.innerText = data.nickname;
        nickname.classList.add(`chat-nickname`);
        nickname2.classList.add(`chat-nickname`);
        if(data.verified) {
            const verified = document.createElement('svg');
            const verified2 = document.createElement('svg');
            nickname.appendChild(verified);
            nickname2.appendChild(verified2);
            verified.outerHTML = ` <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check-circle-fill text-secondary" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-container="body" data-toggle="popover" data-placement="top" data-content="인증된 유저" data-trigger="hover">
        <path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
    </svg>`;
            verified2.outerHTML = ` <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check-circle-fill text-secondary" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-container="body" data-toggle="popover" data-placement="top" data-content="인증된 유저" data-trigger="hover">
        <path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
    </svg>`;
        }
        nickname.classList.add(`${data.chattype}-chat-nickname`);
        nickname2.classList.add(`${data.chattype}-chat-nickname`);
        newchat.appendChild(nickname);
        newchat2.appendChild(nickname2);

        const chat = document.createElement('p');
        const chat2 = document.createElement('p');
        if(data.chattype == 'admin' || data.chattype == 'system') {
            chat.innerHTML = data.chat;
            chat2.innerHTML = data.chat;
        }
        else {
            chat.innerText = data.chat;
            chat2.innerText = data.chat;
        }
        chat.classList.add(`chat-text`);
        chat2.classList.add(`chat-text`);
        chat.classList.add(`${data.chattype}-chat-text`);
        chat2.classList.add(`${data.chattype}-chat-text`);
        newchat.appendChild(chat);
        newchat2.appendChild(chat2);

        ChatBox.appendChild(newchat);
        ChatBox2.appendChild(newchat2);

        ChatBox.scrollTo(0, ChatBox.scrollHeight);
        ChatBox2.scrollTo(0, ChatBox2.scrollHeight);

        $("[data-toggle=popover]").popover();

        chatsound.play();
    });

    socket.on('ScoreUpdate', data => {
        scores[data.fullID]['score'] = data.score;
        scores[data.fullID]['accurary'] = data.accurary;
        scores[data.fullID]['combo'] = data.combo;
        scores[data.fullID]['max_combo'] = data.max_combo;
        showScore(scores);
    });

    let lockkey = {};
    document.onkeydown = e => {
        pressedkey[e.keyCode] = true;

        if(pressedkey[27]) {
            if(countdown == 0) document.getElementById('StopGame').click();
        }

        if(!playing) return;
        if(lockkey[e.code]) return;
        if(!keymap[e.code]) return;
        if(autoplay && e.isTrusted) return;
        lockkey[e.code] = true;

        if(master && create_mode) {
            socket.emit('GiveNote', {
                "key": e.code
            });
            flash_note_area(keymap[e.code]);
        }
        else {
            const note = document.getElementsByClassName(`note_${keymap[e.code]}`)[0];
            if(!note) {
                combo = 0;
                multiplier = 1;
                flash_note_area(keymap[e.code], 'red');
                return;
            }
            const distance = note.dataset.rhythm_time - new Date().getTime() + (note_speed / 20);
            if(distance <= 60 && distance >= -60) {
                score += 5 * multiplier;
                score_no_multiplier += 5;
                flash_note_area(keymap[e.code], 'LightGreen');
                last_note_judgement = 'green';
            }
            else if(distance <= 140 && distance >= -140) {
                score += 3 * multiplier;
                score_no_multiplier += 3;
                flash_note_area(keymap[e.code], 'Yellow');
                last_note_judgement = 'yellow';
            }
            else if(distance <= 200 && distance >= -200) {
                score += 2 * multiplier;
                score_no_multiplier += 2;
                flash_note_area(keymap[e.code], 'Orange');
                last_note_judgement = 'orange';
            }
            else if(distance <= 260 && distance >= -260) {
                score += 1 * multiplier;
                score_no_multiplier += 1;
                flash_note_area(keymap[e.code], 'Tomato');
                last_note_judgement = 'tomato';
            }
            else {
                combo = 0;
                multiplier = 1;
                flash_note_area(keymap[e.code], 'red');
                last_note_judgement = 'red';
            }

            if(distance <= 140 && distance >= -140) multiplier += 0.01;
            else if(distance <= 260 && distance >= -260) multiplier = 1;

            if(distance <= 260 && distance >= -260) {
                note.remove();
                combo += 1;
                if(combo > max_combo) max_combo = combo;
            }

            accurary = score_no_multiplier / possible_max_score * 100;

            socket.emit('ScoreUpdate', {
                score,
                accurary,
                combo,
                max_combo
            });
        }
    }
    document.onkeyup = e => {
        pressedkey[e.keyCode] = false;
        if(!playing) return;
        lockkey[e.code] = false;
    }
}

const script = document.createElement('script');
script.src = '/socket/socket.io.js';
document.head.appendChild(script);

function Request(method, url) {
    var xhr = new XMLHttpRequest();
    xhr.open( method , url , false );
    xhr.send( null );
    return xhr.responseText;
}

function note_interval_func() {
    document.getElementById('score').innerText = `${score}점`;
    document.getElementById('multiplier').innerText = `${multiplier.toFixed(2)}X`;
    document.getElementById('accurary').innerText = `${accurary}%`;
    document.getElementById('combo').innerText = `${combo}콤보`;
    document.getElementById('max_combo').innerText = `최대 ${max_combo}콤보`;

    Array.from(document.getElementsByClassName('note')).forEach(ele => {
        ele.style.bottom = `${(((innerHeight * 0.65 / note_speed) * (ele.dataset.rhythm_time - new Date().getTime())) + innerHeight * 0.65 / note_speed) + innerHeight * 0.3}px`;

        if((ele.dataset.rhythm_time - new Date().getTime() + (note_speed / 20)) < -150) {
            if(!master) flash_note_area(ele.dataset.note, 'purple');
            ele.remove();
            combo = 0;
            multiplier = 1;
            accurary = score / possible_max_score * 100;

            socket.emit('ScoreUpdate', {
                score,
                accurary,
                combo,
                max_combo
            });
        }
    });
}

function download(filename, text) {
    const element = document.createElement('a');
    element.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
    element.download = filename;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    element.remove();
}

let flash_note_area_timeout = {};
function flash_note_area(note, color) {
    if(flash_note_area_timeout[note] != null) flash_note_area_timeout[note].forEach(timeout => {
        clearTimeout(timeout);
    });
    flash_note_area_timeout[note] = [];
    const ele = document.getElementById(`note_area_background_${note}`);
    ele.style.opacity = 1;
    ele.style.backgroundColor = color || '#AAAAAA';
    for(let i = 0; i <= 500; i++) {
        flash_note_area_timeout[note].push(setTimeout(() => {
            ele.style.opacity -= 0.002;
        }, i));
    }
    flash_note_area_timeout[note].push(setTimeout(() => {
        ele.style.opacity = 0;
    }, 500));
}

function SendChat() {
    if(playing) {
        const input = document.getElementById('InputChatForGame');
        if (!input.value) return;

        socket.emit('Chat', {
            'chat': input.value
        });

        input.value = '';

        document.getElementById('InputChatForGame').focus();
    }
    else {
        const input = document.getElementById('InputChat');
        if (!input.value) return;

        socket.emit('Chat', {
            'chat': input.value
        });

        input.value = '';

        document.getElementById('InputChat').focus();
    }
}

function fakeKey(key) {
    document.dispatchEvent(
        new KeyboardEvent("keydown", {
            code: key
        })
    );
    document.dispatchEvent(
        new KeyboardEvent("keyup", {
            code: key
        })
    );
}

function Request(method, url) {
    var xhr = new XMLHttpRequest();
    xhr.open( method , url , false );
    xhr.send( null );
    return xhr.responseText;
}

function updateMusic() {
    document.getElementById('InputMusic').innerHTML = Request('get', '/select_music');
    ChangeRoomSetting(false);
}

function updateNote() {
    document.getElementById('InputNote').innerHTML = Request('get', '/select_note');
    ChangeRoomSetting(false);
}

function showScore(scores) {
    const leaderboard = document.getElementById('Live_LeaderBoard');
    leaderboard.innerHTML = '';
    const title = document.createElement('p');
    title.style.fontSize = '30px';
    title.innerText = 'ScoreBoard';
    leaderboard.appendChild(title);

    for(let key in scores) {
        const player = document.createElement('div');

        const nickname = document.createElement('strong');
        nickname.style.fontSize = '25px';
        nickname.innerText = scores[key].nickname;
        if(scores[key].verified) {
            const verified = document.createElement('svg');
            nickname.appendChild(verified);
            verified.outerHTML = ` <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check-circle-fill text-secondary" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-container="body" data-toggle="popover" data-placement="top" data-content="인증된 유저" data-trigger="hover">
        <path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
    </svg>`;
        }
        player.appendChild(nickname);

        const userscore = document.createElement('p');
        userscore.style.fontSize = '20px'
        userscore.innerText = `${scores[key].score}점`;
        player.appendChild(userscore);

        const useraccurary = document.createElement('p');
        useraccurary.style.fontSize = '20px'
        useraccurary.innerText = `${scores[key].accurary}%`;
        player.appendChild(useraccurary);

        const usercombo = document.createElement('p');
        usercombo.style.fontSize = '20px'
        usercombo.innerText = `${scores[key].combo}콤보`;
        player.appendChild(usercombo);

        const usermaxcombo = document.createElement('p');
        usermaxcombo.style.fontSize = '20px'
        usermaxcombo.innerText = `최대 ${scores[key].max_combo}콤보`;
        player.appendChild(usermaxcombo);

        leaderboard.appendChild(player);
    }
    $("[data-toggle=popover]").popover();
}

function ChangeRoomSetting(show) {
    socket.emit('ChangeRoomSetting', {
        name: document.getElementById('InputName').value,
        password: document.getElementById('InputPassword').value,
        note_speed: document.getElementById('InputNoteSpeed').value,
        music: document.getElementById('InputMusic').value,
        note: document.getElementById('InputNote').value,
        show_alert: show,
        startpos: document.getElementById('InputStartpos').value,
        public: document.getElementById('public').checked,
        pitch: document.getElementById('InputPitch').value
    });
}

function copyToClipboard(str) {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}