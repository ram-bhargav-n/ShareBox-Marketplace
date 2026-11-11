const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },

    sharingType: {
      type: String,
      enum: ["Giveaway", "Exchange"],
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Books & Study",
        "Electronics",
        "Furniture",
        "Clothing",
        "Home & Kitchen",
        "Sports & Outdoors",
        "Toys & Games",
        "Other",
      ],
      required: true,
      default: "Other",
    },

    itemImage: {
      type: [String],
      required: true,
      validate: {
        validator: (images) =>
          images.length >= 1 && images.length <= 5,
        message: "Upload between 1 and 5 images.",
      },
    },

    itemLocation: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Available", "Reserved", "Completed"],
      default: "Available",
    },

    // PRODUCT OWNER
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ADMIN MODERATION
    isRemoved: {
      type: Boolean,
      default: false,
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },

    moderationReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;