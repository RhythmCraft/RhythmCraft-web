module.exports = io => {
    io.on('connection', socket => {
        socket.emit('msg', { "action" : "reload_room" });
    });
}