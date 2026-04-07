const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    // Explicitly whitelist fields — never spread req.body into User.create()
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Admin Intercept ─────────────────────────────────────────────
    // Compare against env-backed admin credentials BEFORE hitting MongoDB.
    // Support both ADMIN_USERNAME and ADMIN_EMAIL (same value in .env is fine).
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const isAdminIdentity = (adminUsername && email === adminUsername) || (adminEmail && email === adminEmail);

    if (adminPassword && isAdminIdentity) {
      // Timing-safe password comparison to mitigate timing attacks
      const inputBuf = Buffer.from(password || "");
      const adminBuf = Buffer.from(adminPassword);

      // timingSafeEqual requires equal-length buffers
      const isAdminMatch =
        inputBuf.length === adminBuf.length &&
        crypto.timingSafeEqual(inputBuf, adminBuf);

      if (isAdminMatch) {
        // Bypass MongoDB entirely — sign admin JWT with role claim
        const token = jwt.sign(
          { id: "SYSTEM_ADMIN", role: "admin" },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.json({
          message: "Login successful",
          token,
        });
      }

      // Admin email matched but password didn't — reject
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ── Standard User Login ─────────────────────────────────────────
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;