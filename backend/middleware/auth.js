const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.sharebox_session;

    if (!token) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify that the user still exists and is active
    const user = await User.findById(decoded.userId).select("_id isSuspended authVersion");

    if (!user) {
      return res.status(401).json({
        message: "User account not found. Please log in again.",
      });
    }

    if ((decoded.tokenVersion || 0) !== (user.authVersion || 0)) {
      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
      });
    }

    // Block suspended accounts
    if (user.isSuspended === true) {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
      });
    }

    req.user = {
      userId: user._id.toString(),
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired session. Please log in again.",
    });
  }
};

module.exports = authMiddleware;