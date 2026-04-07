const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    problemId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
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
    category: {
      type: String,
    },
    tags: {
      type: [String],
    },
    acceptanceRate: {
      type: Number,
    },
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    totalAccepted: {
      type: Number,
      default: 0,
    },
    examples: [
      {
        input: String,
        output: String,
        explanation: String,
      },
    ],
    constraints: {
      type: [String],
    },
    hints: {
      type: [String],
    },
    starterCode: {
      type: mongoose.Schema.Types.Mixed,
      // e.g. { "C++": "...", "Python": "...", "Java": "..." }
    },
    solutionCode: {
      type: mongoose.Schema.Types.Mixed,
      // e.g. { "C++": "...", "Python": "...", "Java": "..." }
    },
    solutionExplanation: {
      type: String,
    },
    testCases: [
      {
        input: String,
        output: String,
      },
    ],
    timeLimit: {
      type: String,
      default: "2s",
    },
    memoryLimit: {
      type: String,
      default: "256 MB",
    },
    timeComplexity: {
      type: String,
    },
    spaceComplexity: {
      type: String,
    },
    executionMode: {
      type: String,
      enum: ["RAW", "CLASS"],
      default: "RAW",
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("Problem", problemSchema);