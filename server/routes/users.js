const express = require("express");
const User = require("../models/User");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// GET /api/users/me — get current user profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/users/me — update current user profile (name, bio)
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { name, bio } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      if (name.trim().length > 50) {
        return res.status(400).json({ message: "Name cannot exceed 50 characters" });
      }
      user.name = name.trim();
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({ message: "Bio must be a string" });
      }
      if (bio.trim().length > 150) {
        return res.status(400).json({ message: "Bio cannot exceed 150 characters" });
      }
      user.bio = bio.trim();
    }

    await user.save();

    const updatedUser = await User.findById(req.userId).select("-password");
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/users/search — search users by name or email (excluding current user)
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const query = req.query.q || "";
    if (!query.trim()) {
      return res.json([]);
    }

    // Escape special regex characters to prevent ReDoS
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      _id: { $ne: req.userId },
      email: { $ne: "talkbot@system.local" }, // Keep bot separate
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } }
      ]
    }).select("-password").limit(10);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/users — return only users who have active chat history with logged-in user + TalkBot
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Find unique users we sent messages to (excluding groups)
    const activeReceivers = await Message.distinct("receiverId", { 
      senderId: req.userId,
      receiverId: { $ne: null } 
    });

    // Find unique users who sent messages to us
    const activeSenders = await Message.distinct("senderId", { 
      receiverId: req.userId 
    });

    // Merge and deduplicate safely (filter nulls)
    const chatPartnerIds = Array.from(
      new Set([...activeReceivers, ...activeSenders].filter(Boolean).map(id => id.toString()))
    );

    // Find TalkBot and add to the list if not already present
    const talkBot = await User.findOne({ email: "talkbot@system.local" });
    if (talkBot && !chatPartnerIds.includes(talkBot._id.toString())) {
      chatPartnerIds.push(talkBot._id.toString());
    }

    const users = await User.find({
      _id: { $in: chatPartnerIds, $ne: req.userId }
    }).select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

