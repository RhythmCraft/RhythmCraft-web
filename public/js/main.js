window.onload = () => {
    if(isClient) {
        require('electron').remote.getGlobal('globalVars').RichPresence = {
            details: '로비',
            state: '로비에서 대기하고 있습니다.',
            startTimestamp: Date.now(),
            largeImageKey: 'main',
            instance: true
        }
    }

    const socket = io.connect('/main', {
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