const express = require("express");
const mongoose = require("mongoose");
const crypto = require("node:crypto");

const authMiddleware = require("../middleware/auth");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Address = require("../models/Address");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Coupon = require("../models/Coupon");
const Review = require("../models/Review");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Category = require("../models/Category");

const router = express.Router();
const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const positiveInt = (value) => Number.isInteger(value) && value > 0;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const addressFields = ["fullName", "phone", "line1", "line2", "city", "state", "postalCode"];
const pickAddressFields = (value) =>
  Object.fromEntries(addressFields.filter((field) => value?.[field] !== undefined).map((field) => [field, value[field]]));
const isSecureUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
};

const populatedCart = (userId) =>
  Cart.findOne({ user: userId }).populate(
    "items.product",
    "name images price originalPrice stock isActive"
  );

const cartResponse = (cart) => ({
  items: (cart?.items || [])
    .filter((line) => line.product)
    .map((line) => ({
      product: line.product,
      quantity: line.quantity,
      lineTotal: line.product.price * line.quantity,
      available: line.product.isActive && line.product.stock >= line.quantity,
    })),
});

router.get("/products", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const activeCategories = await Category.find({ isActive: true }).distinct("name");
    const filter = { isActive: true, category: { $in: activeCategories } };

    if (typeof req.query.category === "string" && req.query.category.trim()) {
      const requestedCategory = req.query.category.trim();
      filter.category = activeCategories.includes(requestedCategory) ? requestedCategory : { $in: [] };
    }
    if (typeof req.query.subcategory === "string" && req.query.subcategory.trim()) {
      filter.subcategory = req.query.subcategory.trim();
    }
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const term = escapeRegex(req.query.q.trim().slice(0, 100));
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
      ];
    }
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      const minimum = req.query.minPrice === undefined ? undefined : Number(req.query.minPrice);
      const maximum = req.query.maxPrice === undefined ? undefined : Number(req.query.maxPrice);
      if ((minimum !== undefined && (!Number.isFinite(minimum) || minimum < 0)) ||
        (maximum !== undefined && (!Number.isFinite(maximum) || maximum < 0)) ||
        (minimum !== undefined && maximum !== undefined && minimum > maximum)) {
        return res.status(400).json({ message: "Enter a valid non-negative price range." });
      }
      filter.price = {};
      if (minimum !== undefined) filter.price.$gte = minimum;
      if (maximum !== undefined) filter.price.$lte = maximum;
    }

    const sortMap = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      popular: { viewCount: -1, createdAt: -1 },
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Marketplace product list error:", error);
    res.status(500).json({ message: "Unable to load products." });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    const reviews = await Review.find({ product: product._id })
      .select("rating comment createdAt")
      .populate("user", "name picture")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const [rating] = await Review.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    res.json({ product, reviews, rating: { average: rating?.average || 0, count: rating?.count || 0 } });
  } catch (error) {
    console.error("Marketplace product detail error:", error);
    res.status(500).json({ message: "Unable to load product details." });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).distinct("name");
    res.json({ categories: categories.sort((a, b) => a.localeCompare(b)) });
  } catch (error) {
    console.error("Marketplace categories error:", error);
    res.status(500).json({ message: "Unable to load categories." });
  }
});

router.use(authMiddleware);

router.get("/cart", async (req, res) => {
  try {
    res.json(cartResponse(await populatedCart(req.user.userId)));
  } catch (error) {
    console.error("Cart fetch error:", error);
    res.status(500).json({ message: "Unable to load your cart." });
  }
});

router.post("/cart/sync", async (req, res) => {
  try {
    const incoming = req.body.items;
    if (!Array.isArray(incoming) || incoming.length > 100) {
      return res.status(400).json({ message: "Cart items must be a list of up to 100 products." });
    }
    const merged = new Map();
    for (const line of incoming) {
      if (!validId(line?.productId) || !positiveInt(line?.quantity)) {
        return res.status(400).json({ message: "Cart contains an invalid product or quantity." });
      }
      merged.set(line.productId, Math.min(99, (merged.get(line.productId) || 0) + line.quantity));
    }
    const products = await Product.find({ _id: { $in: [...merged.keys()] }, isActive: true });
    if (products.length !== merged.size) {
      return res.status(409).json({ message: "Some cart products are unavailable. Review your cart and try again." });
    }
    for (const product of products) {
      const requested = merged.get(product._id.toString());
      if (requested > product.stock) {
        return res.status(409).json({ message: `${product.name} has only ${product.stock} available.` });
      }
    }
    const cart = await Cart.findOne({ user: req.user.userId });
    const quantities = new Map((cart?.items || []).map((line) => [line.product.toString(), line.quantity]));
    for (const [productId, quantity] of merged) {
      const combined = (quantities.get(productId) || 0) + quantity;
      if (combined > 99) return res.status(400).json({ message: "Cart quantity cannot exceed 99 per product." });
      quantities.set(productId, combined);
    }
    const items = [...quantities].map(([product, quantity]) => ({ product, quantity }));
    await Cart.findOneAndUpdate(
      { user: req.user.userId, checkoutLock: null },
      { $set: { items } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(cartResponse(await populatedCart(req.user.userId)));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Checkout is in progress. Try again after it completes." });
    console.error("Cart sync error:", error);
    res.status(500).json({ message: "Unable to synchronize your cart." });
  }
});

router.put("/cart/items/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    if (!validId(productId) || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
      return res.status(400).json({ message: "Enter a valid product and quantity." });
    }
    const product = await Product.findOne({ _id: productId, isActive: true }).select("stock name");
    if (quantity > 0 && (!product || quantity > product.stock)) {
      return res.status(409).json({ message: product ? `${product.name} has only ${product.stock} available.` : "Product is unavailable." });
    }
    const cart = await Cart.findOne({ user: req.user.userId });
    if (!cart && quantity === 0) return res.json({ items: [] });
    const items = (cart?.items || []).filter((line) => line.product.toString() !== productId);
    if (quantity > 0) items.push({ product: productId, quantity });
    await Cart.findOneAndUpdate(
      { user: req.user.userId, checkoutLock: null },
      { $set: { items } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(cartResponse(await populatedCart(req.user.userId)));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Checkout is in progress. Try again after it completes." });
    console.error("Cart update error:", error);
    res.status(500).json({ message: "Unable to update your cart." });
  }
});

router.delete("/cart", async (req, res) => {
  try {
    const result = await Cart.deleteOne({ user: req.user.userId, checkoutLock: null });
    if (!result.deletedCount && await Cart.exists({ user: req.user.userId, checkoutLock: { $ne: null } })) {
      return res.status(409).json({ message: "Checkout is in progress. The cart cannot be cleared yet." });
    }
    res.json({ items: [] });
  } catch (error) {
    console.error("Cart clear error:", error);
    res.status(500).json({ message: "Unable to clear your cart." });
  }
});

router.get("/wishlist", async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.userId }).populate(
      "products",
      "name images price originalPrice stock isActive"
    );
    res.json({ products: (wishlist?.products || []).filter(Boolean) });
  } catch (error) {
    console.error("Wishlist fetch error:", error);
    res.status(500).json({ message: "Unable to load your wishlist." });
  }
});

router.put("/wishlist/:productId", async (req, res) => {
  try {
    if (!validId(req.params.productId)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findOne({ _id: req.params.productId, isActive: true }).select("_id");
    if (!product) return res.status(404).json({ message: "Product is unavailable." });
    await Wishlist.findOneAndUpdate(
      { user: req.user.userId },
      { $addToSet: { products: product._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ message: "Added to wishlist." });
  } catch (error) {
    console.error("Wishlist update error:", error);
    res.status(500).json({ message: "Unable to update your wishlist." });
  }
});

router.delete("/wishlist/:productId", async (req, res) => {
  try {
    if (!validId(req.params.productId)) return res.status(400).json({ message: "Invalid product ID." });
    await Wishlist.updateOne({ user: req.user.userId }, { $pull: { products: req.params.productId } });
    res.json({ message: "Removed from wishlist." });
  } catch (error) {
    console.error("Wishlist removal error:", error);
    res.status(500).json({ message: "Unable to update your wishlist." });
  }
});

router.get("/addresses", async (req, res) => {
  try {
    res.json({ addresses: await Address.find({ user: req.user.userId }).sort({ isDefault: -1, createdAt: -1 }) });
  } catch (error) {
    console.error("Address fetch error:", error);
    res.status(500).json({ message: "Unable to load addresses." });
  }
});

router.post("/addresses", async (req, res) => {
  try {
    const address = await Address.create({ ...pickAddressFields(req.body), user: req.user.userId });
    res.status(201).json({ address });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: "Check the name, Indian phone number, address, and six-digit PIN code." });
    console.error("Address create error:", error);
    res.status(500).json({ message: "Unable to save address." });
  }
});

router.put("/addresses/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid address ID." });
    if (!addressFields.some((field) => req.body?.[field] !== undefined)) {
      return res.status(400).json({ message: "No editable address fields were provided." });
    }
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { $set: pickAddressFields(req.body) },
      { new: true, runValidators: true }
    );
    if (!address) return res.status(404).json({ message: "Address not found." });
    res.json({ address });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: "Check the address details and try again." });
    console.error("Address update error:", error);
    res.status(500).json({ message: "Unable to update address." });
  }
});

router.delete("/addresses/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid address ID." });
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!address) return res.status(404).json({ message: "Address not found." });
    res.json({ message: "Address removed." });
  } catch (error) {
    console.error("Address delete error:", error);
    res.status(500).json({ message: "Unable to remove address." });
  }
});

router.post("/checkout", async (req, res) => {
  const reserved = [];
  let createdOrderId = null;
  let couponUsed = false;
  let couponId = null;
  let lockedCartId = null;
  let checkoutKey = "";
  try {
    const idempotencyKey = typeof req.body.idempotencyKey === "string" ? req.body.idempotencyKey.trim() : "";
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      return res.status(400).json({ message: "A valid checkout key is required." });
    }
    const existingOrder = await Order.findOne({ user: req.user.userId, idempotencyKey });
    if (existingOrder) return res.status(200).json({ order: existingOrder, simulated: true });
    if (!validId(req.body.addressId)) return res.status(400).json({ message: "Select a valid delivery address." });
    const address = await Address.findOne({ _id: req.body.addressId, user: req.user.userId }).lean();
    if (!address) return res.status(404).json({ message: "Delivery address not found." });
    const lockExpiredAt = new Date(Date.now() - 15 * 60 * 1000);
    const cartClaim = await Cart.findOneAndUpdate(
      {
        user: req.user.userId,
        $or: [
          { checkoutLock: null },
          { checkoutLockAt: { $lt: lockExpiredAt } },
        ],
      },
      { $set: { checkoutLock: idempotencyKey, checkoutLockAt: new Date() } },
      { new: true }
    );
    if (!cartClaim) {
      const duplicateOrder = await Order.findOne({ user: req.user.userId, idempotencyKey });
      if (duplicateOrder) return res.status(200).json({ order: duplicateOrder, simulated: true });
      const currentCart = await Cart.findOne({ user: req.user.userId }).select("items");
      if (!currentCart?.items.length) return res.status(400).json({ message: "Your cart is empty." });
      return res.status(409).json({ message: "Another checkout is in progress. Wait for it to finish before retrying." });
    }
    lockedCartId = cartClaim._id;
    checkoutKey = idempotencyKey;
    const cart = await Cart.findById(cartClaim._id).populate("items.product");
    if (!cart?.items.length) return res.status(400).json({ message: "Your cart is empty." });

    const orderItems = [];
    let subtotal = 0;
    for (const line of cart.items) {
      const product = line.product;
      if (!product || !product.isActive || product.stock < line.quantity) {
        return res.status(409).json({ message: `${product?.name || "A product"} is unavailable or has insufficient stock.` });
      }
      subtotal += product.price * line.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0],
        quantity: line.quantity,
        unitPrice: product.price,
      });
    }

    let discount = 0;
    if (req.body.couponCode) {
      const code = typeof req.body.couponCode === "string" ? req.body.couponCode.trim().toUpperCase() : "";
      const coupon = await Coupon.findOne({
        code,
        isActive: true,
        expiresAt: { $gt: new Date() },
        $or: [{ usageLimit: null }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
      });
      if (!coupon || subtotal < coupon.minimumPurchase) {
        return res.status(400).json({ message: "That coupon is invalid, expired, used up, or does not meet the minimum purchase." });
      }
      discount = coupon.type === "percentage"
        ? Math.min(subtotal, Math.round(subtotal * coupon.value / 100))
        : Math.min(subtotal, coupon.value);
      couponId = coupon._id;
    }
    const deliveryCharge = subtotal - discount >= 999 ? 0 : 49;
    const total = subtotal - discount + deliveryCharge;

    for (const line of cart.items) {
      const result = await Product.updateOne(
        { _id: line.product._id, isActive: true, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } }
      );
      if (result.modifiedCount !== 1) throw new Error("STOCK_CHANGED");
      reserved.push({ product: line.product._id, quantity: line.quantity });
    }

    const order = await Order.create({
      user: req.user.userId,
      idempotencyKey,
      items: orderItems,
      address: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      },
      subtotal,
      discount,
      deliveryCharge,
      total,
      timeline: [{ status: "Order Placed", note: "Checkout created; payment has not been processed.", at: new Date() }],
    });
    createdOrderId = order._id;
    await Payment.create({
      order: order._id,
      user: req.user.userId,
      amount: total,
      provider: "mock",
      status: "pending",
      simulated: true,
    });
    if (couponId) {
      const couponUpdate = await Coupon.updateOne(
        { _id: couponId, isActive: true, expiresAt: { $gt: new Date() }, $or: [{ usageLimit: null }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
        { $inc: { usedCount: 1 } }
      );
      if (couponUpdate.modifiedCount !== 1) throw new Error("COUPON_UNAVAILABLE");
      couponUsed = true;
    }
    const clearedCart = await Cart.updateOne(
      { _id: lockedCartId, checkoutLock: checkoutKey },
      { $set: { items: [], checkoutLock: null, checkoutLockAt: null } }
    );
    if (clearedCart.modifiedCount !== 1) throw new Error("CART_LOCK_LOST");
    lockedCartId = null;
    res.status(201).json({ order, simulated: true, message: "Order created. No payment has been taken." });
  } catch (error) {
    if (couponUsed && couponId) await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });
    if (createdOrderId) {
      await Promise.all([
        Payment.deleteOne({ order: createdOrderId }),
        Order.deleteOne({ _id: createdOrderId, user: req.user.userId }),
      ]);
    }
    if (reserved.length) {
      await Promise.all(reserved.map(({ product, quantity }) =>
        Product.updateOne({ _id: product }, { $inc: { stock: quantity } })
      ));
    }
    if (error.code === 11000) {
      const order = await Order.findOne({ user: req.user.userId, idempotencyKey: req.body.idempotencyKey });
      if (order) return res.status(200).json({ order, simulated: true });
    }
    if (error.message === "STOCK_CHANGED") return res.status(409).json({ message: "Stock changed while checking out. Review your cart and try again." });
    if (error.message === "COUPON_UNAVAILABLE") return res.status(409).json({ message: "That coupon was just used or expired. Please retry checkout." });
    console.error("Checkout error:", error);
    res.status(500).json({ message: "Unable to place your order. Please try again." });
  } finally {
    if (lockedCartId) {
      try {
        await Cart.updateOne(
          { _id: lockedCartId, checkoutLock: checkoutKey },
          { $set: { checkoutLock: null, checkoutLockAt: null } }
        );
      } catch (releaseError) {
        console.error("Checkout cart lock release error:", releaseError);
      }
    }
  }
});

router.post("/orders/:id/mock-payment", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid order ID." });
    const order = await Order.findOne({ _id: req.params.id, user: req.user.userId });
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.paymentStatus === "simulated_success") {
      return res.json({ order, simulated: true, message: "This mock payment was already simulated." });
    }
    if (order.paymentStatus !== "pending" || order.status === "Cancelled") {
      return res.status(409).json({ message: "This order is not awaiting payment." });
    }
    const reference = `MOCK-${crypto.randomUUID()}`;
    const payment = await Payment.findOneAndUpdate(
      { order: order._id, user: req.user.userId, status: "pending", simulated: true },
      { $set: { status: "simulated_success", reference } },
      { new: true }
    );
    if (!payment) return res.status(409).json({ message: "Mock payment is not available for this order." });
    order.paymentStatus = "simulated_success";
    order.status = "Confirmed";
    order.timeline.push({ status: "Confirmed", note: "Development-only simulated payment; no money was transferred.", at: new Date() });
    await order.save();
    res.json({ order, simulated: true, message: "Simulated payment complete. No real payment was taken." });
  } catch (error) {
    console.error("Mock payment error:", error);
    res.status(500).json({ message: "Unable to simulate payment." });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ orders });
  } catch (error) {
    console.error("Order history error:", error);
    res.status(500).json({ message: "Unable to load your orders." });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid order ID." });
    const order = await Order.findOne({ _id: req.params.id, user: req.user.userId }).lean();
    if (!order) return res.status(404).json({ message: "Order not found." });
    const payment = await Payment.findOne({ order: order._id, user: req.user.userId }).select("amount status simulated reference createdAt").lean();
    res.json({ order, payment });
  } catch (error) {
    console.error("Order detail error:", error);
    res.status(500).json({ message: "Unable to load your order." });
  }
});

router.post("/orders/:id/cancellation-request", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid order ID." });
    const order = await Order.findOne({ _id: req.params.id, user: req.user.userId }).select("status paymentStatus");
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (!["Order Placed", "Confirmed", "Processing"].includes(order.status)) {
      return res.status(409).json({ message: "This order can no longer be cancelled." });
    }
    const paymentStatus = order.paymentStatus === "pending" ? "cancelled" : order.paymentStatus;
    const cancelledOrder = await Order.findOneAndUpdate(
      { _id: order._id, user: req.user.userId, status: order.status, paymentStatus: order.paymentStatus },
      {
        $set: { status: "Cancelled", paymentStatus },
        $push: { timeline: { status: "Cancelled", note: "Cancellation requested by customer.", at: new Date() } },
      },
      { new: true }
    );
    if (!cancelledOrder) return res.status(409).json({ message: "This order changed while cancelling. Refresh and try again." });
    await Payment.updateOne({ order: cancelledOrder._id, status: "pending" }, { $set: { status: "cancelled" } });
    await Promise.all(cancelledOrder.items.map((line) =>
      line.product ? Product.updateOne({ _id: line.product }, { $inc: { stock: line.quantity } }) : Promise.resolve()
    ));
    res.json({ order: cancelledOrder, message: "Cancellation request submitted." });
  } catch (error) {
    console.error("Order cancellation error:", error);
    res.status(500).json({ message: "Unable to request cancellation." });
  }
});

router.post("/orders/:id/return-request", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid order ID." });
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId, status: "Delivered" },
      {
        $set: { status: "Return Requested" },
        $push: { timeline: { status: "Return Requested", note: "Return requested by customer.", at: new Date() } },
      },
      { new: true }
    );
    if (!order) return res.status(409).json({ message: "Only delivered orders can be returned." });
    res.json({ order, message: "Return request submitted for review." });
  } catch (error) {
    console.error("Return request error:", error);
    res.status(500).json({ message: "Unable to submit return request." });
  }
});

router.post("/reviews", async (req, res) => {
  try {
    const { productId, orderId, rating, comment = "" } = req.body;
    if (!validId(productId) || !validId(orderId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== "string" || comment.length > 1000) {
      return res.status(400).json({ message: "Provide a valid product, delivered order, 1–5 rating, and short review." });
    }
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId,
      status: "Delivered",
      "items.product": productId,
    }).select("_id");
    if (!order) return res.status(403).json({ message: "Only buyers of delivered products can review them." });
    const review = await Review.create({
      product: productId,
      user: req.user.userId,
      order: orderId,
      rating,
      comment: comment.trim(),
    });
    res.status(201).json({ review });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You already reviewed this product from that order." });
    console.error("Review create error:", error);
    res.status(500).json({ message: "Unable to submit review." });
  }
});

router.get("/account", async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("name email picture phone emailVerified phoneVerified createdAt");
    if (!user) return res.status(404).json({ message: "Account not found." });
    res.json({ user });
  } catch (error) {
    console.error("Account fetch error:", error);
    res.status(500).json({ message: "Unable to load your account." });
  }
});

router.patch("/account", async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 60) {
        return res.status(400).json({ message: "Name must contain 2 to 60 characters." });
      }
      updates.name = req.body.name.trim();
    }
    if (req.body.picture !== undefined) {
      if (typeof req.body.picture !== "string" || (req.body.picture && !isSecureUrl(req.body.picture))) {
        return res.status(400).json({ message: "Profile images must use a secure HTTPS URL." });
      }
      updates.picture = req.body.picture;
    }
    if (req.body.phone !== undefined) {
      if (typeof req.body.phone !== "string" || (req.body.phone.trim() && !/^[6-9]\d{9}$/.test(req.body.phone.trim()))) {
        return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
      }
      const phone = req.body.phone.trim() || null;
      const currentUser = await User.findById(req.user.userId).select("phone");
      if (!currentUser) return res.status(404).json({ message: "Account not found." });
      if (currentUser.phone !== phone) updates.phoneVerified = false;
      updates.phone = phone;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No editable account fields were provided." });
    const user = await User.findByIdAndUpdate(req.user.userId, { $set: updates }, { new: true, runValidators: true })
      .select("name email picture phone emailVerified phoneVerified createdAt");
    if (!user) return res.status(404).json({ message: "Account not found." });
    res.json({ user });
  } catch (error) {
    console.error("Account update error:", error);
    res.status(500).json({ message: "Unable to update your account." });
  }
});

router.post("/account/deletion-request", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { accountDeletionRequestedAt: new Date() } },
      { new: true }
    ).select("_id accountDeletionRequestedAt");
    if (!user) return res.status(404).json({ message: "Account not found." });
    res.json({ message: "Account deletion request recorded for administrator review.", requestedAt: user.accountDeletionRequestedAt });
  } catch (error) {
    console.error("Account deletion request error:", error);
    res.status(500).json({ message: "Unable to submit account deletion request." });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ notifications });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ message: "Unable to load notifications." });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid notification ID." });
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json({ notification });
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({ message: "Unable to update notification." });
  }
});

module.exports = router;
