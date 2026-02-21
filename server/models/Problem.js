const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    tags: {
      type: [String],
    },
    testCases: [
      {
        input: String,
        output: String,
      },
    ],
    timeLimit: {
      type: Number,
      default: 2000, // milliseconds
    },
    memoryLimit: {
      type: Number,
      default: 256000, // kilobytes (256 MB)
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", problemSchema);