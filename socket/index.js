const SocketIO = require('socket.io');
const fs = require('fs');

module.exports = (server, app, sessionMiddleware) => {
    const io = SocketIO(server, { path: '/socket' });
    app.set('io', io);

    io.use((socket, next) => {
        if(socket.request.res != null) sessionMiddleware(socket.request, socket.request.res, next);
    });

    const deny_filelist = [ 'index.js' ];
    fs.readdirSync('./socket').forEach(file => {
        if(deny_filelist.indexOf(file) == -1) {
            const ns = io.of(`/${file.replace('.js', '')}`);
            app.set(`socket_${file.replace('.js', '')}`, ns);
            require(`./${file}`)(ns, app);
        }
    });

    const only_send_ns = [ ];
    only_send_ns.forEach(ns => {
        const newns = io.of(`/${ns}`);
        app.set(`socket_${ns}`, newns);
    });
}