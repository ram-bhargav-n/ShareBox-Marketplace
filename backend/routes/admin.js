
const express = require("express");
const mongoose = require("mongoose");

const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/adminMiddleware");

const User = require("../models/User");
const Item = require("../models/Item");
const Request = require("../models/Request");

const router = express.Router();

// ==========================================
// ADMIN SECURITY
// ==========================================

router.use(authMiddleware);
router.use(adminMiddleware);

// ==========================================
// HELPER: PAGINATION
// ==========================================

const getPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

// Escape special regex characters
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ==========================================
// 1. ADMIN DASHBOARD STATISTICS
// ==========================================

router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalUsers,
      totalItems,
      availableItems,
      reservedItems,
      completedItems,
      totalRequests,
      pendingRequests,
      acceptedRequests,
      rejectedRequests,
      cancelledRequests,
    ] = await Promise.all([
      User.countDocuments(),
      Item.countDocuments(),

      Item.countDocuments({
        isRemoved: { $ne: true },
        $or: [
          { status: "Available" },
          { status: { $exists: false } },
        ],
      }),

      Item.countDocuments({ status: "Reserved" }),
      Item.countDocuments({ status: "Completed" }),
      Request.countDocuments(),
      Request.countDocuments({ status: "Pending" }),
      Request.countDocuments({ status: "Accepted" }),
      Request.countDocuments({ status: "Rejected" }),
      Request.countDocuments({ status: "Cancelled" }),
    ]);

    return res.status(200).json({
      success: true,
      statistics: {
        users: {
          total: totalUsers,
        },

        products: {
          total: totalItems,
          available: availableItems,
          reserved: reservedItems,
          completed: completedItems,
        },

        requests: {
          total: totalRequests,
          pending: pendingRequests,
          accepted: acceptedRequests,
          rejected: rejectedRequests,
          cancelled: cancelledRequests,
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      message: "Failed to load admin dashboard.",
    });
  }
});

// ==========================================
// 2. VIEW ALL USERS
// ==========================================

router.get("/users", async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = req.query.search?.trim();

    const filter = {};

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email picture role isSuspended accountDeletionRequestedAt createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);

    return res.status(500).json({
      message: "Failed to fetch users.",
    });
  }
});

// ==========================================
// 3. SUSPEND / REACTIVATE USER
// ==========================================

router.patch("/users/:id/suspension", async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (typeof isSuspended !== "boolean") {
      return res.status(400).json({
        message: "isSuspended must be true or false.",
      });
    }

    if (id === req.user.userId) {
      return res.status(403).json({
        message: "You cannot suspend or modify your own account.",
      });
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (targetUser.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot be suspended using this feature.",
      });
    }

    targetUser.isSuspended = isSuspended;

    await targetUser.save();

    return res.status(200).json({
      success: true,

      message: isSuspended
        ? "User account suspended successfully."
        : "User account reactivated successfully.",

      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isSuspended: targetUser.isSuspended,
      },
    });
  } catch (error) {
    console.error("Admin user suspension error:", error);

    return res.status(500).json({
      message: "Failed to update user account status.",
    });
  }
});

// ==========================================
// 4. VIEW ALL PRODUCTS
// ==========================================

router.get("/items", async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const filter = {
      isRemoved: { $ne: true },
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.sharingType) {
      filter.sharingType = req.query.sharingType;
    }

    if (req.query.search?.trim()) {
      const safeSearch = escapeRegex(req.query.search.trim());

      filter.$or = [
        { itemName: { $regex: safeSearch, $options: "i" } },
        { itemLocation: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const sort =
      req.query.sort === "oldest"
        ? { createdAt: 1, _id: 1 }
        : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate("createdBy", "name email picture")
        .populate("moderatedBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit),

      Item.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin items error:", error);

    return res.status(500).json({
      message: "Failed to fetch products.",
    });
  }
});

// ==========================================
// 5. PERMANENTLY DELETE REVIEWED PRODUCTS
// Request history is retained; active requests are protected.
// ==========================================

router.delete("/items", async (req, res) => {
  try {
    const { itemIds } = req.body;

    if (
      !Array.isArray(itemIds) ||
      itemIds.length === 0 ||
      itemIds.length > 50 ||
      itemIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
    ) {
      return res.status(400).json({
        message: "Select between 1 and 50 valid products.",
      });
    }

    const uniqueIds = [...new Set(itemIds.map(String))];
    const existingItems = await Item.find({
      _id: { $in: uniqueIds },
    })
      .select("_id")
      .lean();
    const existingIds = existingItems.map((item) => item._id.toString());

    const activeRequestItemIds = await Request.distinct("item", {
      item: { $in: existingIds },
      status: { $in: ["Pending", "Accepted"] },
    });
    const activeRequestIdSet = new Set(
      activeRequestItemIds.map((id) => id.toString())
    );
    const skippedIds = existingIds.filter((id) => activeRequestIdSet.has(id));
    const eligibleIds = existingIds.filter((id) => !activeRequestIdSet.has(id));

    const result = eligibleIds.length
      ? await Item.deleteMany({ _id: { $in: eligibleIds } })
      : { deletedCount: 0 };

    return res.status(200).json({
      message: `${result.deletedCount} product(s) permanently deleted.`,
      deletedCount: result.deletedCount,
      deletedIds: eligibleIds,
      skippedActiveRequestIds: skippedIds,
    });
  } catch (error) {
    console.error("Admin permanent product deletion error:", error);

    return res.status(500).json({
      message: "Failed to permanently delete selected products.",
    });
  }
});

// ==========================================
// 6. REMOVE PRODUCT (SOFT DELETE)
// ==========================================

router.patch("/items/:id/moderation", async (req, res) => {
  try {
    const { id } = req.params;

    const reason =
      typeof req.body.reason === "string"
        ? req.body.reason.trim()
        : "";

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    // Validate reason
    if (!reason || reason.length > 500) {
      return res.status(400).json({
        message:
          "A valid moderation reason is required (maximum 500 characters).",
      });
    }

    // Find product
    const item = await Item.findById(id);

    if (!item) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    // Check if already removed
    if (item.isRemoved === true) {
      return res.status(409).json({
        message: "This product has already been removed.",
      });
    }

    // Only available products can be removed.
    // Older records without status are also allowed.
    if (item.status && item.status !== "Available") {
      return res.status(409).json({
        message: "Only available products can be removed.",
      });
    }

    // Save moderation details
    const result = await Item.updateOne(
  {
    _id: id,
    isRemoved: { $ne: true },
  },
  {
    $set: {
      isRemoved: true,
      moderatedBy: req.user.userId,
      moderatedAt: new Date(),
      moderationReason: reason,
    },
  },
  {
    runValidators: true,
  }
);

if (result.modifiedCount !== 1) {
  return res.status(409).json({
    message: "Product could not be removed. Please refresh and try again.",
  });
}

    return res.status(200).json({
      success: true,
      message: "Product removed successfully.",
    });
  } catch (error) {
    console.error("Admin product moderation error:", error);

    return res.status(500).json({
      message: "Failed to remove product.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

// ==========================================
// 6. VIEW ALL REQUESTS
// ==========================================

router.get("/requests", async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .populate({
          path: "item",
          select:
            "itemName itemDescription itemImage sharingType category itemLocation status createdAt",
          match: { isRemoved: { $ne: true } },
        })
        .populate("buyer", "name email picture")
        .populate("seller", "name email picture")
        .populate("discussion.sender", "name email picture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Request.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin requests error:", error);

    return res.status(500).json({
      message: "Failed to fetch requests.",
    });
  }
});

module.exports = router;
