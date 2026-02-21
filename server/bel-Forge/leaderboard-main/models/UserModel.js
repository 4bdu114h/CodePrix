const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Your email address is required"],
    unique: true,
  },
  contestAuthor: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      default: [],
    },
  ],
  contestAdmin: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      default: [],
    },
  ],
  contestParticipant: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      default: [],
    },
  ],
  problemsAuthored: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      default: [],
    },
  ],
  problemsAdmin: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      default: [],
    },
  ],
  username: {
    type: String,
    required: [true, "Your username is required"],
  },
  password: {
    type: String,
    required: [true, "Your password is required"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});


module.exports = mongoose.model("User", userSchema);