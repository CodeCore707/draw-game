const socket=io();
const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");

canvas.width=canvas.offsetWidth;
canvas.height=canvas.offsetHeight;

let drawing=false;
let currentColor="black";

function setColor(c){currentColor=c;}

function draw(x,y){
  ctx.fillStyle=currentColor;
  ctx.fillRect(x,y,4,4);
  socket.emit("draw",{x,y,color:currentColor});
}

canvas.addEventListener("mousedown",()=>drawing=true);
canvas.addEventListener("mouseup",()=>drawing=false);
canvas.addEventListener("mousemove",(e)=>{
  if(!drawing) return;
  draw(e.offsetX,e.offsetY);
});

canvas.addEventListener("touchstart",()=>drawing=true);
canvas.addEventListener("touchend",()=>drawing=false);
canvas.addEventListener("touchmove",(e)=>{
  const rect=canvas.getBoundingClientRect();
  const t=e.touches[0];
  draw(t.clientX-rect.left,t.clientY-rect.top);
});

socket.on("draw",(data)=>{
  ctx.fillStyle=data.color;
  ctx.fillRect(data.x,data.y,4,4);
});

socket.on("timer",(t)=>{
  document.getElementById("timer").innerText=t;
});

socket.on("scoreUpdate",(scores)=>{
  let html="";
  for(let n in scores){
    html+=`<div>${n} : ${scores[n]}</div>`;
  }
  document.getElementById("scoreBoard").innerHTML=html;
});
