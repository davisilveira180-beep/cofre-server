const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      const roomId = msg.room || 'zueira';
      
      if (!rooms[roomId]) rooms[roomId] = new Set();
      
      if (msg.type === 'join') {
        ws.roomId = roomId;
        rooms[roomId].add(ws);
        // avisa quantas pessoas na sala
        broadcast(roomId, { type: 'count', count: rooms[roomId].size });
      }
      
      if (msg.type === 'message') {
        broadcast(roomId, msg, ws);
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      rooms[ws.roomId].delete(ws);
      broadcast(ws.roomId, { type: 'count', count: rooms[ws.roomId].size });
    }
  });
});

function broadcast(roomId, msg, exclude) {
  if (!rooms[roomId]) return;
  rooms[roomId].forEach(client => {
    if (client !== exclude && client.readyState === 1) {
      client.send(JSON.stringify(msg));
    }
  });
}

console.log('COFRE rodando na porta ' + PORT);