const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      default: null,
    },
    code: {
      type: String,
      required: true,
      maxlength: 65536,
    },
    language: {
      type: String,
      required: true,
      enum: ["cpp", "java", "python", "javascript"],
    },
    status: {
      type: String,
      enum: ["PEND", "RUN", "AC", "WA", "TLE", "MLE", "RE", "CE", "IE"],
      default: "PEND",
    },
    metrics: {
      time: { type: Number, default: 0 },
      memory: { type: Number, default: 0 },
    },
    failedTestCase: {
      type: Number,
      default: null,
    },
    logs: {
      stdout: { type: String, default: "" },
      stderr: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);