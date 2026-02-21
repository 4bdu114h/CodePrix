require("dotenv").config();
const mongoose = require("mongoose");

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("❌  MONGO_URI is not set — check your .env file");
  process.exit(1);
}

console.log("Connecting to MongoDB Atlas...");
mongoose
  .connect(uri)
  .then(() => {
    console.log("✅  MongoDB connected successfully!");
    return mongoose.connection.close();
  })
  .catch((err) => {
    console.error("❌  Connection failed:", err.message);
    process.exit(1);
  });
