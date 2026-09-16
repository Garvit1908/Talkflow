const express = require("express");
const Message = require("../models/Message");
const Group = require("../models/Group");
const authMiddleware = require("../middleware/auth");

const router = express.Router();


// GET /api/messages/:userId — get chat history between two users
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      groupId: null,
      $or: [
        { senderId: req.userId, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.userId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/messages/group/:groupId — get group chat history
router.get("/group/:groupId", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!group.members.some(id => id && id.toString() === req.userId)) {
      return res.status(403).json({ message: "Access denied: Not a member of this group" });
    }

    const messages = await Message.find({
      groupId: req.params.groupId,
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "name");

    // Map to include senderName safely (handles deleted/null sender accounts)
    const formatted = messages.map((msg) => ({
      _id: msg._id,
      senderId: msg.senderId?._id || msg.senderId,
      groupId: msg.groupId,
      content: msg.content,
      senderName: msg.senderId?.name || "Unknown",
      createdAt: msg.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
