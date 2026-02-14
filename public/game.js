const COLS = 10;
const ROWS = 20;
const BLOCK = 20;

const COLORS = [
  null,
  "cyan",
  "blue",
  "orange",
  "yellow",
  "green",
  "purple",
  "red"
];

const SHAPES = [
  [],
  [[1,1,1,1]],
  [[2,0,0],[2,2,2]],
  [[0,0,3],[3,3,3]],
  [[4,4],[4,4]],
  [[0,5,5],[5,5,0]],
  [[0,6,0],[6,6,6]],
  [[7,7,0],[0,7,7]]
];

class Player {
  constructor(canvas, scoreEl, controls) {
    this.ctx = canvas.getContext("2d");
    this.ctx.scale(BLOCK, BLOCK);
    this.scoreEl = scoreEl;
    this.controls = controls;
    this.reset();
  }

  reset() {
    this.board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    this.score = 0;
    this.gameOver = false;
    this.spawn();
  }

  spawn() {
    const type = Math.floor(Math.random() * 7) + 1;
    this.piece = {
      shape: SHAPES[type],
      x: 3,
      y: 0
    };
    if (this.collide()) this.gameOver = true;
  }

  collide() {
    return this.piece.shape.some((row, y) =>
      row.some((value, x) =>
        value &&
        (this.board[y + this.piece.y] &&
         this.board[y + this.piece.y][x + this.piece.x]) !== 0
      )
    );
  }

  merge() {
    this.piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          this.board[y + this.piece.y][x + this.piece.x] = value;
        }
      });
    });
  }

  clearLines() {
    outer: for (let y = ROWS - 1; y >= 0; y--) {
      if (this.board[y].every(val => val !== 0)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(COLS).fill(0));
        this.score += 100;
        y++;
      }
    }
    this.scoreEl.innerText = this.score;
  }

  drop() {
    this.piece.y++;
    if (this.collide()) {
      this.piece.y--;
      this.merge();
      this.clearLines();
      this.spawn();
    }
  }

  move(dir) {
    this.piece.x += dir;
    if (this.collide()) this.piece.x -= dir;
  }

  rotate() {
    const m = this.piece.shape;
    this.piece.shape = m[0].map((_, i) => m.map(row => row[i]).reverse());
    if (this.collide()) this.piece.shape = m;
  }

  draw() {
    this.ctx.clearRect(0, 0, COLS, ROWS);
    this.drawMatrix(this.board);
    this.drawMatrix(this.piece.shape, this.piece.x, this.piece.y);
  }

  drawMatrix(matrix, offsetX = 0, offsetY = 0) {
    matrix.forEach((row, y) =>
      row.forEach((value, x) => {
        if (value) {
          this.ctx.fillStyle = COLORS[value];
          this.ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
      })
    );
  }
}

const p1 = new Player(
  document.getElementById("board1"),
  document.getElementById("score1"),
  {left:"a", right:"d", down:"s", rotate:"w"}
);

const p2 = new Player(
  document.getElementById("board2"),
  document.getElementById("score2"),
  {left:"ArrowLeft", right:"ArrowRight", down:"ArrowDown", rotate:"ArrowUp"}
);

function update() {
  if (!p1.gameOver) p1.drop();
  if (!p2.gameOver) p2.drop();

  p1.draw();
  p2.draw();

  if (p1.gameOver && p2.gameOver) {
    let winner = "무승부";
    if (p1.score > p2.score) winner = "Player 1 승리!";
    else if (p2.score > p1.score) winner = "Player 2 승리!";
    document.getElementById("winner").innerText = winner;
    return;
  }

  setTimeout(update, 500);
}

document.addEventListener("keydown", e => {
  if (e.key === p1.controls.left) p1.move(-1);
  if (e.key === p1.controls.right) p1.move(1);
  if (e.key === p1.controls.down) p1.drop();
  if (e.key === p1.controls.rotate) p1.rotate();

  if (e.key === p2.controls.left) p2.move(-1);
  if (e.key === p2.controls.right) p2.move(1);
  if (e.key === p2.controls.down) p2.drop();
  if (e.key === p2.controls.rotate) p2.rotate();
});

function startGame() {
  p1.reset();
  p2.reset();
  document.getElementById("winner").innerText = "";
  update();
}
