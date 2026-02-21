const mongoose = require("mongoose");

const contestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    problems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
      },
    ],
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return this.startTime instanceof Date && value instanceof Date && this.startTime < value;
        },
        message: "End time must be after start time",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contest", contestSchema);