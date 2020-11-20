let save_onload;
if(typeof window.onload == 'function') save_onload = window.onload;
window.onload = () => {
    if(location.pathname == '/friend') document.getElementById('InputNickname').focus();

    const notification = new Howl({
        src: ['/sound/notification.mp3'],
        autoplay: false,
        volume: 0.5,
        html5: true
    });

    const socket = io.connect(`${socket_address}/friend`, {
        path: '/socket'
    });
    socket.on('toast', data => {
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        const toast_header = document.createElement('div');
        toast_header.classList.add('toast-header');
        toast.appendChild(toast_header);

        const image = document.createElement('img');
        image.src = data.image;
        image.classList.add('rounded');
        image.classList.add('mr-2');
        image.width = 20;
        image.height = 20;
        toast_header.appendChild(image);

        const title = document.createElement('strong');
        title.classList.add('mr-auto');
        if(data.allow_html) title.innerHTML = data.title;
        else title.innerText = data.title;
        toast_header.appendChild(title);

        const close = document.createElement('button');
        close.type = 'button';
        close.classList.add('ml-2');
        close.classList.add('mb-1');
        close.classList.add('close');
        close.setAttribute('data-dismiss', 'toast');
        close.setAttribute('aria-label', 'Close');
        toast_header.appendChild(close);

        const close_shape = document.createElement('span');
        close.setAttribute('aria-hidden', 'true');
        close.innerHTML = '&times;';
        close.appendChild(close_shape);

        const toast_body = document.createElement('div');
        toast_body.classList.add('toast-body');
        if(data.allow_html) toast_body.innerHTML = data.text;
        else toast_body.innerText = data.text;
        toast.appendChild(toast_body);

        document.getElementById('toast_zone').appendChild(toast);

        $(toast).toast(data.options || { autohide : false });
        $(toast).toast('show');
        notification.play();
    });

    socket.on('updateStatus', data => {
        if(!location.pathname.startsWith('/friend') && !location.pathname.startsWith('/game')) return;
        if(!document.getElementById(`${data.fullID}_status`)) return;
        document.getElementById(`${data.fullID}_status`).innerText = data.status;
        document.getElementById(`invite_${data.fullID}`).disabled = !data.online;
    });

    Array.from(document.getElementsByClassName('post-button')).forEach(e => {
        e.onclick = () => {
            const form = document.createElement('form');
            form.action = e.dataset.url;
            form.method = 'post';
            form.hidden = true;

            for (let key in e.dataset) {
                if (key == 'url') continue;
                const data = document.createElement('input');
                data.name = key;
                data.value = e.dataset[key];
                form.appendChild(data);
            }

            const submit = document.createElement('button');
            submit.type = 'submit';
            form.appendChild(submit);

            document.body.appendChild(form);

            submit.click();
        }
    });

    if(save_onload) save_onload();
}

if(typeof script == 'undefined') {
    const script = document.createElement('script');
    script.src = '/socket/socket.io.js';
    document.head.appendChild(script);
}