const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: ["mock"], default: "mock" },
    status: { type: String, enum: ["pending", "simulated_success", "failed", "cancelled", "refunded"], default: "pending" },
    simulated: { type: Boolean, default: true },
    reference: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
