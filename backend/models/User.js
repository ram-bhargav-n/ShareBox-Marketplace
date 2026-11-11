
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    picture: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      match: /^[6-9]\d{9}$/,
      default: null,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    accountDeletionRequestedAt: {
      type: Date,
      default: null,
    },

    authVersion: {
      type: Number,
      min: 0,
      default: 0,
    },

    // USER ROLE
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

   isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
