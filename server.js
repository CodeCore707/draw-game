const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};
const words = [
"피카츄","치킨","축구공","강아지","고양이","햄버거","자동차","비행기","공룡","마법사",
"토끼","우주","눈사람","로봇","유령","스마트폰","컴퓨터","딸기","수박","바나나",
"아이스크림","호랑이","사자","곰","판다","고래","상어","문어","오징어","거북이",
"연필","지우개","책","의자","침대","텔레비전","냉장고","세탁기","드론","마이크",
"기타","피아노","드럼","농구공","야구","수영","자전거","스케이트","눈","비",
"태양","달","별","무지개","번개","구름","불","물","얼음","모래",
"산","바다","강","폭포","섬","사막","숲","나무","꽃","장미",
"케이크","초콜릿","사탕","라면","떡볶이","김치","삼겹살","치즈","커피","콜라",
"버스","기차","지하철","택시","우주선","외계인","닌자","해적","왕","공주",
"기사","요리사","의사","경찰","소방관","선생님","학생","좀비","괴물","영웅"
];

function createRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {

  socket.on("joinRoom", ({ name, code }) => {

    if (!rooms[code]) {
      rooms[code] = {
        players: [],
        turn: 0,
        word: "",
        time: 60,
        scores: {}
      };
    }

    socket.join(code);
    socket.data.name = name;
    socket.data.room = code;

    rooms[code].players.push(socket.id);
    rooms[code].scores[name] = 0;

    io.to(code).emit("updatePlayers", getPlayerNames(code));
  });

  socket.on("startGame", () => {
    const room = rooms[socket.data.room];
    if (!room) return;

    nextTurn(socket.data.room);
  });

  socket.on("draw", (data) => {
    socket.to(socket.data.room).emit("draw", data);
  });

  socket.on("guess", (msg) => {
    const room = rooms[socket.data.room];
    if (!room) return;

    if (msg === room.word) {
      room.scores[socket.data.name] += 10;
      io.to(socket.data.room).emit("correct", socket.data.name);
      nextTurn(socket.data.room);
    } else {
      io.to(socket.data.room).emit("chat", {
        name: socket.data.name,
        msg
      });
    }
  });

  socket.on("disconnect", () => {
    const room = rooms[socket.data.room];
    if (!room) return;

    room.players = room.players.filter(id => id !== socket.id);
    delete room.scores[socket.data.name];

    io.to(socket.data.room).emit("updatePlayers", getPlayerNames(socket.data.room));
  });

});

function nextTurn(code) {
  const room = rooms[code];
  if (!room || room.players.length === 0) return;

  room.turn = (room.turn + 1) % room.players.length;
  room.word = words[Math.floor(Math.random() * words.length)];

  const currentDrawer = room.players[room.turn];

  io.to(code).emit("newTurn", {
    drawer: currentDrawer,
    wordLength: room.word.length,
    scores: room.scores
  });

  io.to(currentDrawer).emit("yourWord", room.word);
}

function getPlayerNames(code) {
  const room = rooms[code];
  if (!room) return [];
  return room.players.map(id => {
    const s = io.sockets.sockets.get(id);
    return s?.data.name;
  });
}

server.listen(process.env.PORT || 3000);
