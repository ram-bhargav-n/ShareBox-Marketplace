
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const dns = require("node:dns");
const cookieParser = require("cookie-parser");

dotenv.config();

const authMiddleware = require("./middleware/auth");
const Item = require("./models/Item");
const Request = require("./models/Request");

const MEMBER_ITEM_FIELDS =
  "itemName itemDescription sharingType category itemImage itemLocation status createdAt";

const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const adminRoutes = require("./routes/admin");
const marketplaceRoutes = require("./routes/marketplace");
const adminMarketplaceRoutes = require("./routes/adminMarketplace");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ==========================================
// ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/admin/marketplace", adminMarketplaceRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("ShareBox API is running");
});

// ==========================================
// CREATE ITEM
// ==========================================

app.post("/api/items", authMiddleware, async (req, res) => {
  try {
    const {
      itemName,
      itemDescription,
      sharingType,
      category,
      itemImage,
      itemLocation,
    } = req.body;

    const newItem = new Item({
      itemName,
      itemDescription,
      sharingType,
      category,
      itemImage,
      itemLocation,
      createdBy: req.user.userId,
      status: "Available",
    });

    const savedItem = await newItem.save();

    return res.status(201).json({
      message: "Item created successfully",
      item: {
        _id: savedItem._id,
        itemName: savedItem.itemName,
        itemDescription: savedItem.itemDescription,
        sharingType: savedItem.sharingType,
        category: savedItem.category,
        itemImage: savedItem.itemImage,
        itemLocation: savedItem.itemLocation,
        status: savedItem.status,
        createdAt: savedItem.createdAt,
      },
    });
  } catch (error) {
    console.error("Create item error:", error);

    return res.status(400).json({
      message: "Failed to create item",
    });
  }
});

// ==========================================
// GET ALL PUBLIC PRODUCTS
// HIDE REMOVED AND COMPLETED PRODUCTS
// ==========================================

app.get("/api/items", async (req, res) => {
  try {
    const items = await Item.find({
      isRemoved: { $ne: true },
      status: { $nin: ["Completed"] },
    })
      .select(MEMBER_ITEM_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(items);
  } catch (error) {
    console.error("Fetch items error:", error);

    return res.status(500).json({
      message: "Failed to fetch items",
    });
  }
});

// ==========================================
// GET MY PRODUCTS
// HIDE REMOVED PRODUCTS FROM ALL MEMBER VIEWS
// ==========================================

app.get("/api/items/my", authMiddleware, async (req, res) => {
  try {
    const items = await Item.find({
      createdBy: req.user.userId,
      isRemoved: { $ne: true },
    })
      .select(MEMBER_ITEM_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Fetch my products error:", error);

    return res.status(500).json({
      message: "Failed to fetch your products",
    });
  }
});

// ==========================================
// EDIT MY PRODUCT
// AVAILABLE AND NOT REMOVED ONLY
// ==========================================

app.put("/api/items/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const allowedFields = [
      "itemName",
      "itemDescription",
      "sharingType",
      "category",
      "itemImage",
      "itemLocation",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided",
      });
    }

    const existingItem = await Item.findOne({
      _id: id,
      createdBy: req.user.userId,
      isRemoved: { $ne: true },
    });

    if (!existingItem) {
      return res.status(404).json({
        message: "Product not found or it has been removed.",
      });
    }

    if (
      existingItem.status &&
      existingItem.status !== "Available"
    ) {
      return res.status(409).json({
        message: `Cannot edit a ${existingItem.status.toLowerCase()} product.`,
      });
    }

    const updatedItem = await Item.findOneAndUpdate(
      {
        _id: id,
        createdBy: req.user.userId,
        isRemoved: { $ne: true },
        $or: [
          { status: "Available" },
          { status: { $exists: false } },
        ],
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(MEMBER_ITEM_FIELDS);

    if (!updatedItem) {
      return res.status(409).json({
        message: "Product is no longer available for editing.",
      });
    }

    return res.status(200).json({
      message: "Product updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Update item error:", error);

    return res.status(400).json({
      message: "Failed to update product",
    });
  }
});

// ==========================================
// DELETE MY PRODUCT
// AVAILABLE AND NOT REMOVED ONLY
// ==========================================

app.delete("/api/items/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const existingItem = await Item.findOne({
      _id: id,
      createdBy: req.user.userId,
      isRemoved: { $ne: true },
    });

    if (!existingItem) {
      return res.status(404).json({
        message: "Product not found or it has been removed.",
      });
    }

    if (
      existingItem.status &&
      existingItem.status !== "Available"
    ) {
      return res.status(409).json({
        message: `Cannot delete a ${existingItem.status.toLowerCase()} product.`,
      });
    }

    const activeRequest = await Request.findOne({
      item: id,
      status: {
        $in: ["Pending", "Accepted"],
      },
    });

    if (activeRequest) {
      return res.status(409).json({
        message: "This product has active requests and cannot be deleted.",
      });
    }

    const deletedItem = await Item.findOneAndDelete({
      _id: id,
      createdBy: req.user.userId,
      isRemoved: { $ne: true },
      $or: [
        { status: "Available" },
        { status: { $exists: false } },
      ],
    });

    if (!deletedItem) {
      return res.status(409).json({
        message: "Product is no longer available for deletion.",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete item error:", error);

    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
});

// ==========================================
// GET SINGLE PUBLIC PRODUCT
// HIDE REMOVED PRODUCTS
// ==========================================

app.get("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const item = await Item.findOne({
      _id: id,
      isRemoved: { $ne: true },
    }).select(MEMBER_ITEM_FIELDS);

    if (!item) {
      return res.status(404).json({
        message: "Product not found or has been removed.",
      });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error("Fetch single item error:", error);

    return res.status(500).json({
      message: "Failed to fetch item",
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`ShareBox server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
