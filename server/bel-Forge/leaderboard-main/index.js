const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
require("dotenv").config();
const UpdateLeaderBoardRoute = require("./routes/UpdateLeaderBoard");
const GetLeaderBoardRoute = require("./routes/GetLeaderBoard");
const { MONGO_URL, PORT } = process.env;

mongoose
  .connect(MONGO_URL, {
  })
  .then(() => console.log("MongoDB is connected successfully"))
  .catch((err) => console.error(err));

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

app.use(
    cors({
        origin: '*',
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);

app.use(express.json());

app.use('/', UpdateLeaderBoardRoute);
app.use('/', GetLeaderBoardRoute);