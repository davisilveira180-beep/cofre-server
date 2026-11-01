const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.static(__dirname));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const rooms = {};
io.on('connection', (socket)=>{
  socket.on('joinRoom', ({room, password, nick})=>{
    if(!rooms[room]) rooms[room] = {password: password, users: 0};
    if(rooms[room].password !== password){ socket.emit('errorMsg', 'Senha incorreta!'); return; }
    socket.join(room); rooms[room].users++; socket.room = room; socket.nick = nick;
    socket.to(room).emit('system', `-${nick} entrou-`);
  });
  socket.on('chatMessage', ({text, room, nick})=>{
    socket.to(room).emit('message', {text: text, nick: nick});
  });
  socket.on('disconnect', ()=>{
    if(socket.room && rooms[socket.room]){ rooms[socket.room].users--; if(rooms[socket.room].users<=0) delete rooms[socket.room]; }
  });
});
app.get('/', (req,res)=> res.sendFile(__dirname+'/index.html'));
server.listen(process.env.PORT || 10000, ()=> console.log('ok'));
