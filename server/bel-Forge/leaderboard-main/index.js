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

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // In non-production environments, allow all origins for convenience
        if (process.env.NODE_ENV !== "production") {
            return callback(null, true);
        }

        // In production, only allow explicitly configured origins
        const allowedOrigins = (process.env.CORS_ORIGINS || "")
            .split(",")
            .map(o => o.trim())
            .filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));

app.use(express.json());

app.use('/', UpdateLeaderBoardRoute);
app.use('/', GetLeaderBoardRoute);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});