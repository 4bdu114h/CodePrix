require("dotenv").config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Add it to your .env file.");
}

const http = require("http");
const { Server } = require("socket.io");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { startOrphanReaper } = require("./jobs/orphanReaper");

// ── Route Imports ────────────────────────────────────────────────────
const contestRoutes = require("./routes/contestRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const problemRoutes = require("./routes/problemRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const leaderboardProxyRoutes = require("./routes/leaderboardProxyRoutes");

const app = express();

// Connect Database
connectDB();

// Start background jobs
startOrphanReaper();

// Middleware
app.use(cors());
app.use(express.json());

// ── Global API Rate Limiter ─────────────────────────────────────────
// 100 requests per minute per IP across all /api routes
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
app.use("/api", globalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/leaderboard", leaderboardProxyRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "CodePrix API is running" });
});

// ── HTTP + Socket.IO Server ─────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // Client joins a contest-specific room for scoped broadcasts
  socket.on("join-contest", (contestId) => {
    socket.join(contestId);
  });
});

// Export io so controllers can broadcast leaderboard updates
module.exports = { io };

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
});