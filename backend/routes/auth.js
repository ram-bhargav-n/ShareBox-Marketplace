const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

const limitAuthAttempts = (req, res, next) => {
  const now = Date.now();
  if (loginAttempts.size > 5000) {
    for (const [ip, attempt] of loginAttempts) {
      if (attempt.resetAt <= now) loginAttempts.delete(ip);
    }
  }
  const key = req.ip;
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ message: "Too many authentication attempts. Please wait and try again." });
  }
  current.count += 1;
  return next();
};

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

const COOKIE_NAME = "sharebox_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// ==========================================
// CREATE SESSION
// ==========================================

const createSession = (user, res) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const sessionToken = jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.authVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.cookie(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
};

// ==========================================
// FORMAT SAFE USER INFORMATION
// ==========================================

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  picture: user.picture,
  role: user.role || "user",
});

// ==========================================
// EMAIL/PASSWORD REGISTRATION
// ==========================================

router.post("/register", limitAuthAttempts, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 60) {
      return res.status(400).json({
        message: "Name must contain 2 to 60 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: "Password must contain 8 to 72 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Unable to create an account with those details.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: "user",
    });

    createSession(user, res);

    return res.status(201).json({
      message: "Account created successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Unable to create an account with those details.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Unable to create your account. Please try again.",
    });
  }
});

// ==========================================
// EMAIL/PASSWORD LOGIN
// ==========================================

router.post("/login", limitAuthAttempts, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // BLOCK SUSPENDED USERS
    if (user.isSuspended === true) {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
      });
    }

    createSession(user, res);

    return res.status(200).json({
      message: "Login successful.",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in. Please try again.",
    });
  }
});

// ==========================================
// GOOGLE OAUTH LOGIN
// ==========================================

router.post("/google", limitAuthAttempts, async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({
        message: "Invalid Google account information.",
      });
    }

    if (!payload.email_verified) {
      return res.status(401).json({
        message: "Please use a verified Google email.",
      });
    }

    const cleanEmail = payload.email.trim().toLowerCase();

    let user = await User.findOne({
      googleId: payload.sub,
    });

    if (!user) {
      user = await User.findOne({
        email: cleanEmail,
      });

      // Check before linking Google to an existing account.
      if (user && user.isSuspended === true) {
        return res.status(403).json({
          message: "Your account has been suspended. Please contact support.",
        });
      }

      if (user) {
        user.googleId = payload.sub;
        user.picture = payload.picture || user.picture;
        user.emailVerified = true;

        await user.save();
      } else {
        user = await User.create({
          googleId: payload.sub,
          name: payload.name || "ShareBox Member",
          email: cleanEmail,
          picture: payload.picture || "",
          emailVerified: true,
          role: "user",
        });
      }
    }

    // Also check accounts already linked to Google.
    if (user.isSuspended === true) {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
      });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    createSession(user, res);

    return res.status(200).json({
      message: "Authentication successful.",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Google authentication failed:", error.message);

    return res.status(401).json({
      message: "Google authentication failed.",
    });
  }
});

// ==========================================
// CHECK CURRENT SESSION
// ==========================================

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    if ((decoded.tokenVersion || 0) !== (user.authVersion || 0)) {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }

    // BLOCK SUSPENDED EXISTING SESSIONS
    if (user.isSuspended === true) {
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
      });
    }

    return res.status(200).json({
      user: formatUser(user),
    });
  } catch {
    return res.status(401).json({
      message: "Invalid or expired session.",
    });
  }
});

// ==========================================
// LOGOUT
// ==========================================

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  router.post("/change-password", limitAuthAttempts, authMiddleware, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        newPassword.length < 8 ||
        newPassword.length > 72
      ) {
        return res.status(400).json({ message: "Enter your current password and a new password of 8 to 72 characters." });
      }
      const user = await User.findById(req.user.userId).select("passwordHash");
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "Password changes are unavailable for this account." });
      }
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.authVersion = (user.authVersion || 0) + 1;
      await user.save();
      createSession(user, res);
      return res.json({ message: "Password updated. Other sessions have been signed out." });
    } catch (error) {
      console.error("Password update error:", error.message);
      return res.status(500).json({ message: "Unable to update your password." });
    }
  });

  return res.status(200).json({
    message: "Logged out successfully.",
  });
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;