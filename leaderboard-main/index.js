const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const UpdateLeaderBoardRoute = require("./routes/UpdateLeaderBoard");
const GetLeaderBoardRoute = require("./routes/GetLeaderBoard");
const { MONGO_URL, PORT, CLIENT_URL } = process.env;

const app = express();

// 1. Wrap Express in native HTTP server (required for WebSocket Upgrade handshake)
const httpServer = createServer(app);

// 2. Instantiate Socket.IO with strict CORS bounds
const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL || "http://localhost:8080",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// 3. Inject io into Express app locals for downstream controller access
app.set("io", io);

// MongoDB connection
mongoose
    .connect(MONGO_URL, {})
    .then(() => console.log("MongoDB is connected successfully"))
    .catch((err) => console.error(err));

// Middleware
app.use(
    cors({
        origin: CLIENT_URL || "http://localhost:8080",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);
app.use(express.json());

// Routes
app.use("/", UpdateLeaderBoardRoute);
app.use("/", GetLeaderBoardRoute);

// 4. TCP Connection & Room Lifecycle Management
io.on("connection", (socket) => {
    console.log(`[TCP Connected] Client: ${socket.id}`);

    // Client requests to subscribe to a specific contest leaderboard
    socket.on("join-contest", (contest_link_code) => {
        const roomName = `leaderboard:${contest_link_code}`;
        socket.join(roomName);
        console.log(`[Room Joined] ${socket.id} → ${roomName}`);
    });

    socket.on("disconnect", () => {
        // Socket.IO automatically removes the socket from all joined rooms
        console.log(`[TCP Disconnected] Client: ${socket.id}`);
    });
});

// IMPORTANT: Listen on httpServer, NOT app
httpServer.listen(PORT, () => {
    console.log(`Leaderboard Gateway active on port ${PORT}`);
});