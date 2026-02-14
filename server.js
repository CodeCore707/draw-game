const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const multer = require("multer");
const Filter = require("bad-words");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const filter = new Filter();

let users = {};
let rooms = {};
let guestCount = 1;
let onlineUsers = 0;

const TURN_TIME = 60;
const words = ["피카츄","치킨","축구공","강아지","고양이","햄버거","자동차","비행기","공룡","마법사"];

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req,file,cb)=>{
    cb(null, Date.now()+"-"+file.originalname);
  }
});
const upload = multer({ storage });

/* 회원가입 */
app.post("/register", async (req,res)=>{
  const { username, password } = req.body;
  if(users[username]) return res.json({success:false});

  const hash = await bcrypt.hash(password,10);
  users[username] = { password: hash, profile:null };
  res.json({success:true});
});

/* 로그인 */
app.post("/login", async (req,res)=>{
  const { username, password } = req.body;
  const user = users[username];
  if(!user) return res.json({success:false});

  const match = await bcrypt.compare(password,user.password);
  if(!match) return res.json({success:false});

  res.json({success:true, profile:user.profile});
});

/* 프로필 업로드 */
app.post("/uploadProfile", upload.single("profile"), (req,res)=>{
  const { username } = req.body;
  users[username].profile = "/uploads/"+req.file.filename;
  res.json({imageUrl:users[username].profile});
});

/* 소켓 */
io.on("connection",(socket)=>{

  onlineUsers++;
  io.emit("onlineCount", onlineUsers);

  socket.on("guestLogin",()=>{
    const name = "Guest"+guestCount++;
    socket.emit("guestAssigned",name);
  });

  socket.on("joinRoom",({name,code})=>{

    if(!rooms[code]){
      rooms[code]={
        players:[],
        turn:-1,
        word:"",
        scores:{},
        timer:null,
        timeLeft:TURN_TIME
      };
    }

    socket.join(code);
    socket.data.name=name;
    socket.data.room=code;

    rooms[code].players.push(socket.id);
    rooms[code].scores[name]=0;

    io.to(code).emit("updatePlayers",getPlayerNames(code));
  });

  socket.on("startGame",()=>{
    nextTurn(socket.data.room);
  });

  socket.on("draw",(data)=>{
    socket.to(socket.data.room).emit("draw",data);
  });

  socket.on("guess",(msg)=>{
    const room=rooms[socket.data.room];
    if(!room) return;

    if(filter.isProfane(msg)) msg="🤐";

    if(msg===room.word){
      room.scores[socket.data.name]+=10;
      io.to(socket.data.room).emit("scoreUpdate",room.scores);
      nextTurn(socket.data.room);
    }else{
      io.to(socket.data.room).emit("chat",{name:socket.data.name,msg});
    }
  });

  socket.on("disconnect",()=>{
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);
  });

});

function nextTurn(code){
  const room=rooms[code];
  if(!room) return;

  if(room.timer) clearInterval(room.timer);

  room.turn=(room.turn+1)%room.players.length;
  room.word=words[Math.floor(Math.random()*words.length)];
  room.timeLeft=TURN_TIME;

  const currentDrawer=room.players[room.turn];

  io.to(code).emit("newTurn",{
    drawer:currentDrawer,
    scores:room.scores,
    wordLength:room.word.length
  });

  io.to(currentDrawer).emit("yourWord",room.word);

  room.timer=setInterval(()=>{
    room.timeLeft--;
    io.to(code).emit("timer",room.timeLeft);
    if(room.timeLeft<=0) nextTurn(code);
  },1000);
}

function getPlayerNames(code){
  return rooms[code].players.map(id=>{
    const s=io.sockets.sockets.get(id);
    return s?.data.name;
  });
}

server.listen(process.env.PORT||3000);
