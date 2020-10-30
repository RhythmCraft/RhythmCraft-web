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