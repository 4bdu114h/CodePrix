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
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    verdict: {
      type: String,
      enum: ["Accepted", "Wrong Answer", "Runtime Error"],
      default: "Wrong Answer",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);