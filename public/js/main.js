window.onload = () => {
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