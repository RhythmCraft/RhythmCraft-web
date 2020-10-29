/*
AGPL 3.0 LICENSE
Copyright HYONSU(github wjdgustn) ALl rights Reserved
 */

const allowed_map = 'abcdefghijklmnopqrstuvwxyz1234567890'.split('');
const event_map = {};
let text_map = '';
let secret_key_max_length = 10;

window.SecretKey = {
    add: (text, callback) => {
        if(typeof text != 'string') throw new Error('Text must be string.');
        text = text.toLowerCase();
        text.split('').forEach(c => {
            if(allowed_map.indexOf(c) == -1) throw new Error('Text must include only alphabet and number.');
        });
        if(typeof callback != 'function') throw new Error('Callback must be function.');
        if(text.length > secret_key_max_length) secret_key_max_length = text.length;
        event_map[text] = callback;
    },
    remove: text => {
        delete event_map[text];
    }
}

document.onkeydown = e => {
    if(allowed_map.indexOf(e.key) == -1) return;
    text_map += e.key;
    if(text_map.length > secret_key_max_length) text_map = text_map.substring(text_map.length - secret_key_max_length);
    for(let key in event_map) {
        if(text_map.endsWith(key)) event_map[key]();
    }
}