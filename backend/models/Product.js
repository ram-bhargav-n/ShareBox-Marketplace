const mongoose = require("mongoose");
const isSecureImageUrl = (image) => {
  try {
    const url = new URL(image);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
};

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    images: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: (images) =>
          images.length >= 1 &&
          images.length <= 8 &&
          images.every(isSecureImageUrl),
        message: "Add between 1 and 8 secure HTTPS product image URLs.",
      },
    },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    subcategory: { type: String, trim: true, maxlength: 80, default: "" },
    stock: { type: Number, required: true, min: 0, default: 0 },
    viewCount: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    removalHistory: [{
      removedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      removedAt: { type: Date, default: Date.now },
      reason: { type: String, trim: true, maxlength: 500, default: "" },
      restoredAt: { type: Date, default: null },
      restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    }],
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", category: "text" });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, price: 1 });
productSchema.index({ isActive: 1, viewCount: -1 });
productSchema.pre("validate", function validatePricePair() {
  if (this.originalPrice < this.price) {
    this.invalidate("originalPrice", "Original price must be greater than or equal to the current price.");
  }
});

module.exports = mongoose.model("Product", productSchema);
