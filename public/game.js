const socket = io();
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;

canvas.addEventListener("mousedown", () => drawing = true);
canvas.addEventListener("mouseup", () => drawing = false);
canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;

  const x = e.offsetX;
  const y = e.offsetY;

  ctx.fillRect(x, y, 4, 4);

  socket.emit("draw", { x, y });
});

socket.on("draw", (data) => {
  ctx.fillRect(data.x, data.y, 4, 4);
});

document.getElementById("guessInput").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    socket.emit("guess", e.target.value);
    e.target.value = "";
  }
});

function startGame() {
  socket.emit("startGame");
}

socket.on("chat", (data) => {
  document.getElementById("chat").innerHTML += `<div>${data.name}: ${data.msg}</div>`;
});

socket.on("updatePlayers", (players) => {
  document.getElementById("players").innerText = players.join(", ");
});

socket.on("yourWord", (word) => {
  alert("너의 단어: " + word);
});
