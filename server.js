const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('join_room', ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    socket.to(room).emit('user_joined', { id: socket.id, username });

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

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  socket.on('disconnect', () => {
    if (socket.room) {
      socket.to(socket.room).emit('user_left', { id: socket.id, username: socket.username });
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
