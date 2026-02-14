const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const { createClient } = require("redis");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ================= DB ================= */

const db = new sqlite3.Database("./users.db");

db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  avatar TEXT
)
`);

/* ================= Redis ================= */

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.connect();

/* ================= 업로드 ================= */

const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req,file,cb)=>{
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({storage});

/* ================= 기본 변수 ================= */

let rooms = {};
let onlineUsers = 0;
let guestCount = 1;

const badWords = ["바보","멍청이","욕1"];

function filterMessage(message){
  let filtered = message;
  badWords.forEach(word=>{
    const regex = new RegExp(word,"gi");
    filtered = filtered.replace(regex,"***");
  });
  return filtered;
}

/* ================= 로그인 ================= */

app.post("/register", async (req,res)=>{
  const {username,password} = req.body;
  const hashed = await bcrypt.hash(password,10);

  db.run(
    "INSERT INTO users (username,password) VALUES (?,?)",
    [username,hashed],
    (err)=>{
      if(err) return res.json({success:false});
      res.json({success:true});
    }
  );
});

app.post("/login",(req,res)=>{
  const {username,password} = req.body;

  db.get(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err,user)=>{
      if(!user) return res.json({success:false});
      const match = await bcrypt.compare(password,user.password);
      res.json({success:match});
    }
  );
});

/* ================= 프로필 사진 ================= */

app.post("/upload-avatar", upload.single("avatar"), (req,res)=>{
  const username = req.body.username;
  const filePath = "/uploads/" + req.file.filename;

  db.run(
    "UPDATE users SET avatar=? WHERE username=?",
    [filePath, username],
    ()=>res.json({success:true,path:filePath})
  );
});

/* ================= 소켓 ================= */

io.on("connection",(socket)=>{

  onlineUsers++;
  io.emit("onlineCount",onlineUsers);

  socket.on("disconnect",()=>{
    onlineUsers--;
    io.emit("onlineCount",onlineUsers);
  });

  /* ===== 게스트 ===== */
  socket.on("guestLogin",()=>{
    const guestName = "Guest" + guestCount++;
    socket.emit("guestAssigned",guestName);
  });

  /* ===== 방 생성 ===== */
  socket.on("createRoom", async ()=>{
    const code = Math.random().toString(36).substring(2,6).toUpperCase();

    rooms[code] = { users:{} };

    await redisClient.set("room:"+code, JSON.stringify(rooms[code]));

    socket.emit("roomCreated",{
      code,
      link: `/?room=${code}`
    });
  });

  /* ===== 방 입장 ===== */
  socket.on("joinRoom", async (code)=>{

    if(!rooms[code]){
      const data = await redisClient.get("room:"+code);
      if(data){
        rooms[code] = JSON.parse(data);
      }else{
        return;
      }
    }

    socket.join(code);
  });

  /* ===== 채팅 ===== */
  socket.on("chatMessage",(data)=>{
    const cleanMessage = filterMessage(data.message);

    io.to(data.code).emit("chatMessage",{
      username:data.username,
      message:cleanMessage
    });
  });

});

server.listen(3000,()=>{
  console.log("Server running on port 3000");
});
