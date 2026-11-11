const express = require("express");
const mongoose = require("mongoose");

const Request = require("../models/Request");
const Item = require("../models/Item");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const MEMBER_ITEM_FIELDS =
  "itemName itemDescription sharingType category itemImage itemLocation status createdAt";
const HANDOVER_METHODS = [
  "local_pickup",
  "seller_delivery",
  "seller_choice",
  "custom",
];
const MAX_HANDOVER_DETAILS_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 500;

// All request routes require authentication
router.use(authMiddleware);

// ==========================================
// 1. CREATE A REQUEST
// ==========================================

router.post("/", async (req, res) => {
  try {
    const { itemId, message, handoverPreference, handoverDetails } = req.body;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    // Validate message
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Please enter a message.",
      });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({
        message: "Message cannot exceed 500 characters.",
      });
    }

    if (!HANDOVER_METHODS.includes(handoverPreference)) {
      return res.status(400).json({
        message: "Choose a valid pickup or delivery preference.",
      });
    }

    const cleanHandoverDetails =
      typeof handoverDetails === "string" ? handoverDetails.trim() : "";

    if (
      handoverPreference === "custom" &&
      !cleanHandoverDetails
    ) {
      return res.status(400).json({
        message: "Describe your preferred handover arrangement.",
      });
    }

    if (cleanHandoverDetails.length > MAX_HANDOVER_DETAILS_LENGTH) {
      return res.status(400).json({
        message: "Handover details cannot exceed 500 characters.",
      });
    }

    // Find product and exclude removed products
    const item = await Item.findOne({
      _id: itemId,
      isRemoved: { $ne: true },
    });

    if (!item) {
      return res.status(404).json({
        message: "Product not found or has been removed.",
      });
    }

    // Check product availability
    if (item.status && item.status !== "Available") {
      return res.status(400).json({
        message: `This product is currently ${item.status}.`,
      });
    }

    // Check product ownership
    if (!item.createdBy) {
      return res.status(400).json({
        message: "This older product cannot receive requests yet.",
      });
    }

    // Prevent requesting own product
    if (item.createdBy.toString() === req.user.userId) {
      return res.status(403).json({
        message: "You cannot request your own product.",
      });
    }

    // Check duplicate request
    const existingRequest = await Request.findOne({
      item: itemId,
      buyer: req.user.userId,
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "You have already submitted a request for this product.",
      });
    }

    // Create request
    const newRequest = await Request.create({
      item: itemId,
      buyer: req.user.userId,
      seller: item.createdBy,
      message: message.trim(),
      handoverPreference,
      handoverDetails:
        handoverPreference === "custom" ? cleanHandoverDetails : "",
    });

    return res.status(201).json({
      message: "Your request was submitted successfully!",
      request: {
        id: newRequest._id,
        status: newRequest.status,
        handoverPreference: newRequest.handoverPreference,
        handoverDetails: newRequest.handoverDetails,
      },
    });

  } catch (error) {
    console.error("Create request error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already requested this product.",
      });
    }

    return res.status(500).json({
      message: "Unable to submit request.",
    });
  }
});

// ==========================================
// 2. GET MY SENT REQUESTS
// ==========================================

router.get("/mine", async (req, res) => {
  try {
    const requests = await Request.find({
      buyer: req.user.userId,
    })
      .populate({
        path: "item",
        select: MEMBER_ITEM_FIELDS,
        match: { isRemoved: { $ne: true } },
      })
      .populate("seller", "name picture")
      .populate("discussion.sender", "name picture")
      .sort({ createdAt: -1 });

    return res.json(requests);

  } catch (error) {
    console.error("My requests error:", error);

    return res.status(500).json({
      message: "Unable to load your requests.",
    });
  }
});

// ==========================================
// 3. GET INCOMING REQUESTS
// ==========================================

router.get("/incoming", async (req, res) => {
  try {
    const requests = await Request.find({
      seller: req.user.userId,
    })
      .populate({
        path: "item",
        select: MEMBER_ITEM_FIELDS,
        match: { isRemoved: { $ne: true } },
      })
      .populate("buyer", "name picture")
      .populate("discussion.sender", "name picture")
      .sort({ createdAt: -1 });

    return res.json(requests);

  } catch (error) {
    console.error("Incoming requests error:", error);

    return res.status(500).json({
      message: "Unable to load incoming requests.",
    });
  }
});

// ==========================================
// 4. ACCEPT OR REJECT A REQUEST
// ==========================================

router.patch("/:id/status", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      status,
      sellerHandoverPreference,
      sellerHandoverDetails,
    } = req.body;

    // Validate request ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    // Validate status
    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid request status.",
      });
    }

    const cleanSellerHandoverDetails =
      typeof sellerHandoverDetails === "string"
        ? sellerHandoverDetails.trim()
        : "";

    if (
      status === "Accepted" &&
      !HANDOVER_METHODS.includes(sellerHandoverPreference)
    ) {
      return res.status(400).json({
        message: "Choose a valid pickup or delivery arrangement before accepting.",
      });
    }

    if (
      status === "Accepted" &&
      sellerHandoverPreference === "custom" &&
      !cleanSellerHandoverDetails
    ) {
      return res.status(400).json({
        message: "Describe the custom handover arrangement.",
      });
    }

    if (cleanSellerHandoverDetails.length > MAX_HANDOVER_DETAILS_LENGTH) {
      return res.status(400).json({
        message: "Handover details cannot exceed 500 characters.",
      });
    }

    let updatedRequest = null;

    await session.withTransaction(async () => {

      // Find pending request belonging to seller
      const request = await Request.findOne({
        _id: req.params.id,
        seller: req.user.userId,
        status: "Pending",
      }).session(session);

      if (!request) {
        throw new Error("REQUEST_NOT_AVAILABLE");
      }

      // --------------------------------------
      // REJECT REQUEST
      // --------------------------------------

      if (status === "Rejected") {

        updatedRequest = await Request.findOneAndUpdate(
          {
            _id: request._id,
            seller: req.user.userId,
            status: "Pending",
          },
          {
            $set: {
              status: "Rejected",
            },
          },
          {
            new: true,
            session,
            runValidators: true,
          }
        );

        if (!updatedRequest) {
          throw new Error("REQUEST_NOT_AVAILABLE");
        }

        return;
      }

      // --------------------------------------
      // ACCEPT REQUEST AND RESERVE PRODUCT
      // REMOVED PRODUCTS CANNOT BE RESERVED
      // --------------------------------------

      const reservedItem = await Item.findOneAndUpdate(
        {
          _id: request.item,
          createdBy: req.user.userId,
          isRemoved: { $ne: true },

          $or: [
            { status: "Available" },
            { status: { $exists: false } },
          ],
        },
        {
          $set: {
            status: "Reserved",
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      // Product removed, reserved or unavailable
      if (!reservedItem) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }

      // --------------------------------------
      // UPDATE SELECTED REQUEST
      // --------------------------------------

      updatedRequest = await Request.findOneAndUpdate(
        {
          _id: request._id,
          seller: req.user.userId,
          status: "Pending",
        },
        {
          $set: {
            status: "Accepted",
            sellerHandoverPreference,
            sellerHandoverDetails:
              sellerHandoverPreference === "custom"
                ? cleanSellerHandoverDetails
                : "",
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!updatedRequest) {
        throw new Error("REQUEST_NOT_AVAILABLE");
      }

      // --------------------------------------
      // REJECT OTHER PENDING REQUESTS
      // FOR THE SAME PRODUCT
      // --------------------------------------

      await Request.updateMany(
        {
          item: request.item,
          _id: { $ne: request._id },
          status: "Pending",
        },
        {
          $set: {
            status: "Rejected",
          },
        },
        {
          session,
        }
      );

    });

    // Transaction completed successfully
    return res.json({
      message: `Request ${status.toLowerCase()} successfully.`,
      request: updatedRequest,
    });

  } catch (error) {

    if (error.message === "REQUEST_NOT_AVAILABLE") {
      return res.status(409).json({
        message: "Request not found or already processed.",
      });
    }

    if (error.message === "PRODUCT_UNAVAILABLE") {
      return res.status(409).json({
        message: "This product is removed, reserved, or unavailable.",
      });
    }

    console.error("Update request error:", error);

    return res.status(500).json({
      message: "Unable to update request.",
    });

  } finally {
    await session.endSession();
  }
});

// ==========================================
// 5. DISCUSS REQUEST AND HANDOVER DETAILS
// ==========================================

router.post("/:id/messages", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    const text =
      typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: "Messages must contain 1 to 500 characters.",
      });
    }

    const request = await Request.findOne({
      _id: req.params.id,
      $or: [
        { buyer: req.user.userId },
        { seller: req.user.userId },
      ],
      status: { $in: ["Pending", "Accepted"] },
    });

    if (!request) {
      return res.status(404).json({
        message: "Active request not found.",
      });
    }

    request.discussion.push({
      sender: req.user.userId,
      text,
    });
    await request.save();

    const savedMessage = request.discussion[request.discussion.length - 1];
    const sender = await User.findById(req.user.userId).select("name picture");

    return res.status(201).json({
      message: {
        _id: savedMessage._id,
        sender,
        text: savedMessage.text,
        createdAt: savedMessage.createdAt,
      },
    });
  } catch (error) {
    console.error("Request message error:", error);

    return res.status(500).json({
      message: "Unable to send message.",
    });
  }
});

// ==========================================
// 6. CANCEL MY REQUEST
// ==========================================

router.patch("/:id/cancel", async (req, res) => {
  try {

    // Validate request ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    // Cancel only buyer's pending request
    const cancelledRequest = await Request.findOneAndUpdate(
      {
        _id: req.params.id,
        buyer: req.user.userId,
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!cancelledRequest) {
      return res.status(404).json({
        message: "Request not found or cannot be cancelled.",
      });
    }

    return res.json({
      message: "Request cancelled successfully.",
      request: cancelledRequest,
    });

  } catch (error) {
    console.error("Cancel request error:", error);

    return res.status(500).json({
      message: "Unable to cancel request.",
    });
  }
});

// ==========================================
// 7. MARK PRODUCT AS COMPLETED
// REMOVED PRODUCTS CANNOT BE COMPLETED
// ==========================================

router.patch("/item/:itemId/complete", async (req, res) => {
  try {
    const { itemId } = req.params;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    // Check whether this seller has an accepted request
    const acceptedRequest = await Request.findOne({
      item: itemId,
      seller: req.user.userId,
      status: "Accepted",
    });

    if (!acceptedRequest) {
      return res.status(400).json({
        message: "No accepted request found for this product.",
      });
    }

    // Update product status
    // Exclude removed products
    const completedItem = await Item.findOneAndUpdate(
      {
        _id: itemId,
        createdBy: req.user.userId,
        status: "Reserved",
        isRemoved: { $ne: true },
      },
      {
        $set: {
          status: "Completed",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!completedItem) {
      return res.status(400).json({
        message: "Product is removed, not reserved, or cannot be completed.",
      });
    }

    return res.json({
      message: "Product marked as completed successfully!",
      item: {
        _id: completedItem._id,
        status: completedItem.status,
      },
    });

  } catch (error) {
    console.error("Complete product error:", error);

    return res.status(500).json({
      message: "Unable to complete product.",
    });
  }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;