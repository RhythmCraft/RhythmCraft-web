const setting = require('../setting.json');

module.exports = io => {
    io.on('connection', socket => {
        socket.emit('msg', { "action" : "saveid" , "id" : socket.id.replace('#', '<sh>') , "port" : setting.ENFORCE_SOCKET_STANDARD_PORT ? (setting.USE_SSL ? 443 : 80) : setting.PORT });
    });
}