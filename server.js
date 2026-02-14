const express = require("express");
const app = express();
const path = require("path");

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("서버 실행:", PORT));
