const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static('public'));

// ذخیره اطلاعات بازیکنان: { socketId: { username: "steve", x: 0, y: 0, z: 0, world: "world" } }
let players = {};

// دریافت مختصات از پلاگین پاکت‌ماین
app.post('/api/positions', (req, res) => {
    const data = req.body; // فرمت دریافتی: { "playername": { x, y, z, world } }
    
    // به‌روزرسانی مختصات بر اساس نام کوچک‌شده
    for (const [name, pos] of Object.entries(data)) {
        const lowerName = name.toLowerCase();
        for (const socketId in players) {
            if (players[socketId].username === lowerName) {
                players[socketId].x = pos.x;
                players[socketId].y = pos.y;
                players[socketId].z = pos.z;
                players[socketId].world = pos.world;
            }
        }
    }

    // ارسال مختصات جدید به کلاینت‌های وب
    io.emit('positions_update', players);
    res.sendStatus(200);
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (rawUsername) => {
        const username = rawUsername.trim().toLowerCase();
        players[socket.id] = {
            username: username,
            x: null,
            y: null,
            z: null,
            world: null
        };
        socket.emit('joined', { id: socket.id, username: username });
        io.emit('players_list', players);
        console.log(`User joined: ${username} (${socket.id})`);
    });

    // سیگنالینگ WebRTC
    socket.on('signal', (data) => {
        io.to(data.target).emit('signal', {
            sender: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        delete players[socket.id];
        io.emit('player_left', socket.id);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Proximity Voice Server running on port ${PORT}`);
});
