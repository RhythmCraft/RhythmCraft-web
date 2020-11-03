window.onload = () => {
    if(isClient) {
        require('electron').remote.getGlobal('globalVars').RichPresence = {
            details: '로비',
            state: '로비에서 대기하고 있습니다.',
            startTimestamp: Date.now(),
            largeImageKey: 'main',
            instance: true
        }

        document.getElementById('InputRoom').oninput = function() {
            const url = new URL(this.value);
            this.value = url.search.replace('?room=', '');
        }
    }

    const socket = io.connect(`${socket_address}/main`, {
        path: '/socket'
    });
    socket.on('msg', data => {
        console.log(data);
        switch(data.action) {
            case 'reload_room':
                const result = Request('get', '/room');
                document.getElementById('room').innerHTML = result;
        }
    });

    SecretKey.add('wasans', () => {
        alert('와! 샌즈 아시는구나!');
    });

    SecretKey.add('maple', () => {
        location.href = '/testnote?note=f3d82b657f0e0e24b4061dedea94f875.signedrhythmcraft&from_workshop=true';
    });
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

let menu_opened = false;
let menu_selected = -0;
function press(n) {
    console.log(n);
    switch(n) {
        case 0:
            document.activeElement.click();
            break;
        case 1:
            gamepad.vibrationActuator.playEffect("dual-rumble", {
                startDelay: 0,
                duration: 150,
                weakMagnitude: 1.0,
                strongMagnitude: 0.5
            });
            document.getElementById('newroom').click();
            break;
        case 9:
            gamepad.vibrationActuator.playEffect("dual-rumble", {
                startDelay: 0,
                duration: 150,
                weakMagnitude: 1.0,
                strongMagnitude: 0.5
            });
            menu_opened = !menu_opened;
            if(menu_opened) menu_selected = -1;
            document.getElementById('menu-button').click();
            break;
        case 12:
            if(!menu_opened) break;
            if(menu_selected > 0) menu_selected--;
            document.getElementsByClassName('dropdown-item')[menu_selected].focus();
            break;
        case 13:
            if(!menu_opened) break;
            if(menu_selected < document.getElementsByClassName('dropdown-item').length - 1) menu_selected++;
            document.getElementsByClassName('dropdown-item')[menu_selected].focus();
            break;
    }
}

let gamepad;

addEventListener('gamepadconnected', e => {
    gamepad = e.gamepad;

    document.getElementById('newroom').innerHTML = `새 방 만들기 <br><img src="/img/gamepad_buttons_b.png" width="50" height="50">`;

    requestAnimationFrame(updateStatus);
});
addEventListener('gamepaddisconnected', e => {
    gamepad = undefined;
});

const pressed = {};
function updateStatus() {
    if(!gamepad) return;
    gamepad = navigator.getGamepads()[0];
    for(let i = 0; i < gamepad.buttons.length; i++) {
        const button = gamepad.buttons[i];
        if(button.value == 1 && !pressed[i]) {
            pressed[i] = true;
            press(i);
        }
        if(button.value != 1) pressed[i] = false;
    }
    requestAnimationFrame(updateStatus);
}