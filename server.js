const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ذخیره موقعیت مکانی بازیکنان
let playerPositions = {};

// دریافت مختصات از سمت سرور ماینکرفت
app.post('/api/update-positions', (req, res) => {
  playerPositions = req.body || {};
  io.emit('positions_updated', playerPositions);
  res.sendStatus(200);
});

io.on('connection', (socket) => {
  let playerName = null;

  socket.on('register', (name) => {
    playerName = name.toLowerCase().trim();
    socket.join('proximity_world');
    socket.emit('registered', { name: playerName });
  });

  // ارسال داده‌های صوتی بین کلاینت‌ها (WebRTC Signaling)
  socket.on('signal', (data) => {
    io.to(data.targetSocketId).emit('signal', {
      senderSocketId: socket.id,
      senderName: playerName,
      signal: data.signal
    });
  });

  socket.on('disconnect', () => {
    // پاکسازی موقع قطع ارتباط
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
