const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static('public'));

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('join', (username) => {
        currentUser = username;
        console.log(`User joined: ${username} (${socket.id})`);
        // به بقیه کاربران جدید بودن این شخص را اعلام کن
        socket.broadcast.emit('user_joined', { username, socketId: socket.id });
    });

    socket.on('signal', (data) => {
        io.to(data.targetSocketId).emit('signal', {
            senderSocketId: socket.id,
            signalData: data.signalData
        });
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            console.log(`User left: ${currentUser}`);
            socket.broadcast.emit('user_left', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Test Voice Server running on port ${PORT}`);
});
