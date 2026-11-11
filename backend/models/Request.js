const mongoose = require("mongoose");

const handoverMethods = [
  "local_pickup",
  "seller_delivery",
  "seller_choice",
  "custom",
];

const requestMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const requestSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    handoverPreference: {
      type: String,
      enum: handoverMethods,
    },

    handoverDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    sellerHandoverPreference: {
      type: String,
      enum: handoverMethods,
    },

    sellerHandoverDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    discussion: {
      type: [requestMessageSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

requestSchema.index(
  { item: 1, buyer: 1 },
  { unique: true }
);

const Request = mongoose.model("Request", requestSchema);

module.exports = Request;
