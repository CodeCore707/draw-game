const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

const words = [
"apple","banana","cat","dog","house","car","phone","tree","computer","pizza",
"sun","moon","star","school","book","pen","guitar","drum","chair","table",
"water","fire","earth","wind","robot","camera","shoe","shirt","hat","clock",
"fish","bird","lion","tiger","snake","milk","cake","ice","bus","train",
"plane","ship","mountain","river","cloud","rain","snow","beach","island","door",
"window","bed","sofa","lamp","key","wallet","bag","glasses","watch","candle",
"ring","flower","grass","rock","bridge","road","map","flag","ball","game",
"toy","rocket","helmet","bike","truck","pencil","eraser","notebook","mirror","brush",
"knife","fork","spoon","bottle","cup","plate","tv","radio","speaker","microphone",
"camera","battery","fan","clock","ladder","hammer","paint","monster","ghost","dragon"
];

function generateRoomCode() {
  return Math.random().toString(36).substring(2,7).toUpperCase();
}

io.on("connection", (socket) => {

  socket.on("createRoom", (name) => {
    const code = generateRoomCode();
    rooms[code] = {
      users: {},
      drawer: null,
      word: "",
      timer: null,
      timeLeft: 60
    };
    socket.join(code);
    rooms[code].users[socket.id] = { name, score: 0 };
    socket.emit("roomCreated", code);
    io.to(code).emit("updateUsers", rooms[code].users);
  });

  socket.on("joinRoom", ({code, name}) => {
    if (!rooms[code]) return;
    socket.join(code);
    rooms[code].users[socket.id] = { name, score: 0 };
    io.to(code).emit("updateUsers", rooms[code].users);
  });

  socket.on("startGame", (code) => {
    const room = rooms[code];
    if (!room) return;

    const players = Object.keys(room.users);
    room.drawer = players[Math.floor(Math.random()*players.length)];
    room.word = words[Math.floor(Math.random()*words.length)];
    room.timeLeft = 60;

    io.to(code).emit("newRound", {
      drawer: room.drawer,
      wordLength: room.word.length
    });

    io.to(room.drawer).emit("yourTurn", room.word);

    room.timer = setInterval(() => {
      room.timeLeft--;
      io.to(code).emit("timer", room.timeLeft);

      if (room.timeLeft <= 0) {
        clearInterval(room.timer);
        io.to(code).emit("roundEnd", room.word);
      }
    },1000);
  });

  socket.on("draw", ({code, data}) => {
    socket.to(code).emit("draw", data);
  });

  socket.on("chat", ({code, msg}) => {
    const room = rooms[code];
    if (!room) return;

    if (msg.toLowerCase() === room.word) {
      room.users[socket.id].score += 10;
      clearInterval(room.timer);
      io.to(code).emit("roundEnd", room.word);
      io.to(code).emit("updateUsers", room.users);
    } else {
      io.to(code).emit("message", msg);
    }
  });

  socket.on("disconnecting", () => {
    for (const code of socket.rooms) {
      if (rooms[code]) {
        delete rooms[code].users[socket.id];
        io.to(code).emit("updateUsers", rooms[code].users);
      }
    }
  });

});

server.listen(process.env.PORT || 3000);
