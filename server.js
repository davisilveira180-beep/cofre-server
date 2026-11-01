const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));
app.disable('x-powered-by');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const salas = new Map();
const mensagens = new Map();

// REGRA 1: APAGA TUDO COM MAIS DE 24H
setInterval(() => {
  const limite = Date.now() - 24 * 60 * 60 * 1000;
  for (const [sala, lista] of mensagens) {
    const filtradas = lista.filter(m => m.createdAt > limite);
    if (filtradas.length === 0) mensagens.delete(sala);
    else mensagens.set(sala, filtradas);
  }
}, 10 * 60 * 1000);

io.on('connection', (socket) => {
  socket.on('joinRoom', ({room, password, nick}) => {
    if(!room || !password || !nick) return;
    room = room.toLowerCase().trim();
    if(!salas.has(room)) salas.set(room, password);
    if(salas.get(room) !== password){
      socket.emit('errorMsg','Senha errada!'); return;
    }
    socket.join(room);
    socket.data.room = room;
    socket.emit('history', mensagens.get(room) || []);
    socket.to(room).emit('system','Um fantasma entrou');
  });

  socket.on('chatMessage', ({text, room, nick}) => {
    if(!text || !room) return;
    room = room.toLowerCase().trim();
    const msg = { nick: nick || 'anon', text, createdAt: Date.now() };
    if(!mensagens.has(room)) mensagens.set(room, []);
    mensagens.get(room).push(msg);
    io.to(room).emit('message', msg);
  });

  // REGRA 2: SE TODO MUNDO SAIR, APAGA NA HORA
  socket.on('disconnect', () => {
    const room = socket.data.room;
    if(!room) return;
    const qtdNaSala = io.sockets.adapter.rooms.get(room)?.size || 0;
    if(qtdNaSala === 0){
      mensagens.delete(room);
      // se quiser que a senha também zere quando esvaziar, descomente a linha abaixo:
      // salas.delete(room);
      console.log(`Sala ${room} esvaziou - histórico apagado`);
    }
  });
});

app.get('/', (req,res) => res.sendFile(__dirname + '/index.html'));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Papo Fantasma ON - 24h + esvaziou apaga'));
