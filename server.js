const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// مسیر اصلی تست سرور
app.get('/', (req, res) => {
  res.send('Voice Chat Server is running successfully!');
});

// مدیریت اتصالات ویس‌چت و اتاق‌ها
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // پیوستن به اتاق
  socket.on('join_room', ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    console.log(`User ${username} (${socket.id}) joined room: ${room}`);

    // اطلاع به دیگران در همان اتاق
    socket.to(room).emit('user_joined', { id: socket.id, username });

    // ارسال لیست کاربران موجود در اتاق به فرد جدید
    const roomClients = io.sockets.adapter.rooms.get(room);
    const users = [];
    if (roomClients) {
      roomClients.forEach((clientId) => {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket) {
          users.push({ id: clientSocket.id, username: clientSocket.username });
        }
      });
    }
    io.to(socket.id).emit('room_users', users);
  });

  // سیگنالینگ WebRTC (برای انتقال صدا بین کاربران)
  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  // قطع ارتباط کاربر
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.room) {
      socket.to(socket.room).emit('user_left', { id: socket.id, username: socket.username });
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
