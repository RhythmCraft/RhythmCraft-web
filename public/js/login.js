window.onload = function() {
    document.getElementById('InputEmail').focus();

    const socket = io.connect(`${socket_address}/qrlogin`, {
        path: '/socket'
    });

    let socketid;
    socket.on('msg', (data) => {
        console.log(data);
        switch(data.action) {
            case 'qrlogin':
                document.getElementById('InputEmail').value = data.email;
                document.getElementById('InputPassword').value = data.password;
                document.getElementById('LoginForm').submit();
                break;
            case 'saveid':
                socketid = data.id;
                document.getElementById('qrlogin').src = encodeURI(`/getqrcode?socketID=${socketid}`);
                break;
            case 'alert':
                alert(data.msg);
                break;
        }
    });
}

const script = document.createElement('script');
script.src = '/socket/socket.io.js';
document.head.appendChild(script);