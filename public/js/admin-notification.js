window.onload = () => {
    document.getElementById('InputTarget').focus();

    document.getElementById('form').onsubmit = function(e) {
        e.preventDefault();
        RequestForm('post', '/send-notification', new FormData(this));
    }
}

function RequestForm(method, url, data) {
    var xhr = new XMLHttpRequest();
    xhr.open( method , url , false );
    xhr.setRequestHeader("Content-type", "application/json");

    const send_data = {};
    for(let [key, value] of data.entries()) {
        send_data[key] = value;
    }

    xhr.send( JSON.stringify(send_data) );
    return xhr.responseText;
}