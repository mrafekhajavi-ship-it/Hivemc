   const express = require('express');
   const http = require('http');
   const { Server } = require('socket.io');

   const app = express();
   const server = http.createServer(app);
   const io = new Server(server, { cors: { origin: "*" } });

   app.use(express.json());
   app.use(express.static('public'));

   let players = {};

   app.post('/api/positions', (req, res) => {
       const data = req.body;
       for (const [name, pos] of Object.entries(data)) {
           if (!players[name]) players[name] = {};
           players[name].x = pos.x;
           players[name].y = pos.y;
           players[name].z = pos.z;
           players[name].world = pos.world;
       }
       io.emit('positions_update', players);
       res.sendStatus(200);
   });

   io.on('connection', (socket) => {
       let currentUser = null;

       socket.on('join', (username) => {
           currentUser = username;
           if (!players[username]) players[username] = {};
           players[username].socketId = socket.id;
           socket.broadcast.emit('user_joined', { username, socketId: socket.id });
       });

       socket.on('signal', (data) => {
           io.to(data.targetSocketId).emit('signal', {
               senderSocketId: socket.id,
               signalData: data.signalData
           });
       });

       socket.on('disconnect', () => {
           if (currentUser && players[currentUser]) {
               delete players[currentUser].socketId;
               socket.broadcast.emit('user_left', currentUser);
           }
       });
   });

   const PORT = process.env.PORT || 3000;
   server.listen(PORT, () => {
       console.log(`Voice Server running on port ${PORT}`);
   });
