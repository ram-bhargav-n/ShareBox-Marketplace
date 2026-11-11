const mongoose = require("mongoose");

const orderLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    idempotencyKey: { type: String, required: true },
    items: { type: [orderLineSchema], required: true },
    address: { type: addressSnapshotSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    deliveryCharge: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Order Placed", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Returned", "Refunded"],
      default: "Order Placed",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "simulated_success", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    timeline: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model("Order", orderSchema);
