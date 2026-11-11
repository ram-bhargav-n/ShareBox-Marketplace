
const User = require("../models/User");

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("role");

    if (!user) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin privileges required.",
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);

    return res.status(500).json({
      message: "Unable to verify admin permissions.",
    });
  }
};

module.exports = adminMiddleware;
