require("dotenv").config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Add it to your .env file.");
}

const contestRoutes = require("./routes/contestRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const problemRoutes = require("./routes/problemRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/contests", contestRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "CodePrix API is running" });
});

const PORT = 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});