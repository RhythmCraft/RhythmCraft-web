const setting = require('../setting.json');

module.exports = io => {
    io.on('connection', socket => {
        socket.emit('msg', { "action" : "saveid" , "id" : socket.id.replace('#', '<sh>') , "port" : setting.PORT });
    });
}