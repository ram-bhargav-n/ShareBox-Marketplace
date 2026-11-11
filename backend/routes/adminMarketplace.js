const express = require("express");
const mongoose = require("mongoose");

const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/adminMiddleware");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Coupon = require("../models/Coupon");
const User = require("../models/User");

const router = express.Router();
const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const ORDER_STATUSES = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Return Requested",
  "Returned",
  "Refunded",
];

router.use(authMiddleware, adminMiddleware);

router.get("/dashboard", async (_req, res) => {
  try {
    const [
      users,
      products,
      activeProducts,
      removedProducts,
      orders,
      pendingOrders,
      cancelledOrders,
      simulatedPayments,
      pendingPayments,
      simulatedOrderValue,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: false }),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ["Order Placed", "Confirmed", "Processing"] } }),
      Order.countDocuments({ status: "Cancelled" }),
      Payment.countDocuments({ status: "simulated_success" }),
      Payment.countDocuments({ status: "pending" }),
      Order.aggregate([{ $match: { paymentStatus: "simulated_success" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    ]);
    res.json({
      users,
      products,
      activeProducts,
      removedProducts,
      orders,
      pendingOrders,
      cancelledOrders,
      simulatedPayments,
      pendingPayments,
      actualRevenue: 0,
      simulatedOrderValue: simulatedOrderValue[0]?.total || 0,
    });
  } catch (error) {
    console.error("Marketplace admin dashboard error:", error);
    res.status(500).json({ message: "Unable to load marketplace statistics." });
  }
});

router.get("/products", async (req, res) => {
  try {
    const filter = {};
    if (req.query.removed === "true") filter.isActive = false;
    else if (req.query.removed === "false") filter.isActive = true;
    const products = await Product.find(filter).sort({ updatedAt: -1 }).limit(200);
    res.json({ products });
  } catch (error) {
    console.error("Admin marketplace product list error:", error);
    res.status(500).json({ message: "Unable to load products." });
  }
});

router.post("/products", async (req, res) => {
  try {
    const { name, description, images, price, originalPrice, category, subcategory, stock } = req.body;
    if (!Array.isArray(images) || images.length < 1 || images.length > 8 ||
      typeof name !== "string" || !name.trim() ||
      typeof description !== "string" || !description.trim() ||
      !Number.isFinite(price) || price < 0 ||
      !Number.isFinite(originalPrice) || originalPrice < price ||
      typeof category !== "string" || !category.trim() ||
      !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ message: "Provide a name, description, secure product images, valid prices, category, and stock quantity." });
    }
    const activeCategory = await Category.findOne({ name: category.trim(), isActive: true }).select("_id");
    if (!activeCategory) return res.status(400).json({ message: "Choose an active marketplace category before publishing this product." });
    const product = await Product.create({ name, description, images, price, originalPrice, category, subcategory, stock });
    res.status(201).json({ product });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Admin product create error:", error);
    res.status(500).json({ message: "Unable to create product." });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const allowed = ["name", "description", "images", "price", "originalPrice", "category", "subcategory", "stock"];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "No editable product fields were provided." });
    if (updates.price !== undefined && (!Number.isFinite(updates.price) || updates.price < 0)) return res.status(400).json({ message: "Price must be a non-negative number." });
    if (updates.originalPrice !== undefined && (!Number.isFinite(updates.originalPrice) || updates.originalPrice < 0)) return res.status(400).json({ message: "Original price must be a non-negative number." });
    if (updates.stock !== undefined && (!Number.isInteger(updates.stock) || updates.stock < 0)) return res.status(400).json({ message: "Stock must be a non-negative whole number." });
    const currentProduct = await Product.findById(req.params.id).select("price originalPrice");
    if (!currentProduct) return res.status(404).json({ message: "Product not found." });
    const nextPrice = updates.price ?? currentProduct.price;
    const nextOriginalPrice = updates.originalPrice ?? currentProduct.originalPrice;
    if (nextOriginalPrice < nextPrice) return res.status(400).json({ message: "Original price must be greater than or equal to current price." });
    if (updates.category !== undefined) {
      if (typeof updates.category !== "string" || !await Category.exists({ name: updates.category.trim(), isActive: true })) {
        return res.status(400).json({ message: "Choose an active marketplace category." });
      }
      updates.category = updates.category.trim();
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    res.json({ product });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Admin product update error:", error);
    res.status(500).json({ message: "Unable to update product." });
  }
});

router.patch("/products/:id/removal", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const { removed, reason = "" } = req.body;
    if (typeof removed !== "boolean" || typeof reason !== "string" || reason.trim().length > 500) {
      return res.status(400).json({ message: "Provide a removal action and a reason of at most 500 characters." });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (removed === !product.isActive) return res.status(409).json({ message: removed ? "Product is already removed." : "Product is already active." });
    if (removed) {
      product.isActive = false;
      product.removalHistory.push({ removedBy: req.user.userId, reason: reason.trim() });
    } else {
      product.isActive = true;
      const latestRemoval = product.removalHistory[product.removalHistory.length - 1];
      if (latestRemoval && !latestRemoval.restoredAt) {
        latestRemoval.restoredAt = new Date();
        latestRemoval.restoredBy = req.user.userId;
      }
    }
    await product.save();
    res.json({ product });
  } catch (error) {
    console.error("Admin product moderation error:", error);
    res.status(500).json({ message: "Unable to update product listing status." });
  }
});

router.delete("/products", async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length < 1 || productIds.length > 50 || productIds.some((id) => !validId(id))) {
      return res.status(400).json({ message: "Select between 1 and 50 valid products." });
    }
    const ids = [...new Set(productIds.map(String))];
    const products = await Product.find({ _id: { $in: ids } }).select("_id isActive");
    if (products.some((product) => product.isActive)) {
      return res.status(409).json({ message: "Remove products from public listings before permanently deleting them." });
    }
    const foundIds = products.map((product) => product._id);
    if (!foundIds.length) return res.status(404).json({ message: "No selected products were found." });

    await Promise.all([
      Cart.updateMany({}, { $pull: { items: { product: { $in: foundIds } } } }),
      Wishlist.updateMany({}, { $pull: { products: { $in: foundIds } } }),
      Review.deleteMany({ product: { $in: foundIds } }),
      Order.updateMany(
        { "items.product": { $in: foundIds } },
        { $set: { "items.$[line].product": null } },
        { arrayFilters: [{ "line.product": { $in: foundIds } }] }
      ),
    ]);
    const result = await Product.deleteMany({ _id: { $in: foundIds } });
    res.json({ deletedCount: result.deletedCount, message: `${result.deletedCount} product(s) permanently deleted. Order item snapshots were retained.` });
  } catch (error) {
    console.error("Admin permanent product deletion error:", error);
    res.status(500).json({ message: "Unable to permanently delete selected products." });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    res.json({ categories: await Category.find().sort({ name: 1 }) });
  } catch (error) {
    console.error("Admin categories error:", error);
    res.status(500).json({ message: "Unable to load categories." });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const slug = typeof req.body.slug === "string" ? req.body.slug.trim().toLowerCase() : "";
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(400).json({ message: "Enter a category name and a valid lowercase slug." });
    const category = await Category.create({ name, slug });
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That category slug already exists." });
    console.error("Admin category create error:", error);
    res.status(500).json({ message: "Unable to create category." });
  }
});

router.patch("/categories/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid category ID." });
    const updates = {};
    if (typeof req.body.name === "string" && req.body.name.trim()) updates.name = req.body.name.trim();
    if (typeof req.body.isActive === "boolean") updates.isActive = req.body.isActive;
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "Provide a category name or active status." });
    const category = await Category.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: "Category not found." });
    res.json({ category });
  } catch (error) {
    console.error("Admin category update error:", error);
    res.status(500).json({ message: "Unable to update category." });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const filter = {};
    if (typeof req.query.status === "string" && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const orders = await Order.find(filter).populate("user", "name email").sort({ createdAt: -1 }).limit(200).lean();
    res.json({ orders });
  } catch (error) {
    console.error("Admin orders error:", error);
    res.status(500).json({ message: "Unable to load orders." });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!validId(id)) return res.status(400).json({ message: "Invalid order ID." });
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid order status." });
    if (status === "Cancelled") return res.status(409).json({ message: "Customer cancellation requests update stock safely; use the order cancellation flow." });
    if (status === "Refunded") return res.status(409).json({ message: "No real payment processor is configured; refunds cannot be issued in mock mode." });
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (["Cancelled", "Returned", "Refunded"].includes(order.status)) return res.status(409).json({ message: "This order is already closed." });
    order.status = status;
    order.timeline.push({ status, note: "Status updated by marketplace administrator.", at: new Date() });
    await order.save();
    res.json({ order });
  } catch (error) {
    console.error("Admin order status update error:", error);
    res.status(500).json({ message: "Unable to update order status." });
  }
});

router.get("/payments", async (_req, res) => {
  try {
    const payments = await Payment.find().populate("order", "status total createdAt").populate("user", "name email").sort({ createdAt: -1 }).limit(200).lean();
    res.json({ payments });
  } catch (error) {
    console.error("Admin payments error:", error);
    res.status(500).json({ message: "Unable to load payment records." });
  }
});

router.get("/coupons", async (_req, res) => {
  try {
    res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }).limit(200) });
  } catch (error) {
    console.error("Admin coupon list error:", error);
    res.status(500).json({ message: "Unable to load coupons." });
  }
});

router.post("/coupons", async (req, res) => {
  try {
    const { code, type, value, minimumPurchase = 0, expiresAt, usageLimit = null } = req.body;
    if (typeof code !== "string" || !/^[A-Z0-9_-]{3,30}$/i.test(code.trim()) ||
      !["percentage", "fixed"].includes(type) || !Number.isFinite(value) || value <= 0 ||
      (type === "percentage" && value > 100) || !Number.isFinite(minimumPurchase) || minimumPurchase < 0 ||
      !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now() ||
      (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1))) {
      return res.status(400).json({ message: "Coupon details are invalid or the expiry date has passed." });
    }
    const coupon = await Coupon.create({ code: code.trim().toUpperCase(), type, value, minimumPurchase, expiresAt, usageLimit });
    res.status(201).json({ coupon });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That coupon code already exists." });
    console.error("Admin coupon create error:", error);
    res.status(500).json({ message: "Unable to create coupon." });
  }
});

router.patch("/coupons/:id", async (req, res) => {
  try {
    if (!validId(req.params.id) || typeof req.body.isActive !== "boolean") return res.status(400).json({ message: "Provide a valid coupon and active status." });
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: { isActive: req.body.isActive } }, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    res.json({ coupon });
  } catch (error) {
    console.error("Admin coupon update error:", error);
    res.status(500).json({ message: "Unable to update coupon." });
  }
});

module.exports = router;
