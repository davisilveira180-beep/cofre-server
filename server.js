const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.static(__dirname));
app.disable('x-powered-by');

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" },
  allowRequest: (req, cb) => {
    // Não loga IP nenhum
    cb(null, true);
  }
});

// Só guarda senha, NADA de mensagem ou IP
const rooms = new Map(); // room -> hash da senha

function hash(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

io.on('connection', (socket) => {
  // Zero log aqui

  socket.on('joinRoom', ({room, password, nick}) => {
    if(!room || !password || !nick) return;
    
    const h = hash(password);
    if(!rooms.has(room)){
      rooms.set(room, h); // cria sala
    } else {
      if(rooms.get(room) !== h){
        socket.emit('errorMsg', 'Senha errada!');
        return;
      }
    }
    
    socket.join(room);
    socket.data.room = room;
    // Não salva nick nem IP em lugar nenhum
    socket.to(room).emit('system', 'Um fantasma entrou');
  });

  socket.on('chatMessage', ({text, room, nick}) => {
    if(!text || !room) return;
    // Repassa na hora e esquece, não guarda em array nenhum
    socket.to(room).emit('message', { 
      nick: nick || 'anon', 
      text: text,
      id: crypto.randomUUID().slice(0,6) // id aleatório, sem IP
    });
  });

  socket.on('disconnect', () => {
    // Não loga nada
  });
});

app.get('/', (req,res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  // Nem log de porta
});
