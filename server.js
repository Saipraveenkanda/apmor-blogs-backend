const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const Router = require("./connections/routes");

const app = express();
app.use(express.json({ limit: "50mb" }));
//"mongodb://192.168.0.122:27017/aapmorBlogsDb"
app.use(cors());
mongoose.connect(process.env.MONGODB_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("connected to database");
});
app.use(Router);
app.listen(3005, () => {
  console.log("server running at 3005");
});

module.exports = app;
