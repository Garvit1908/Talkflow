const express = require("express");
const Group = require("../models/Group");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();


// POST /api/groups — create a new group
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || typeof name !== "string" || !name.trim() || !Array.isArray(members) || members.length === 0) {
      return res
        .status(400)
        .json({ message: "Group name and members array are required" });
    }

    if (name.trim().length > 100) {
      return res
        .status(400)
        .json({ message: "Group name cannot exceed 100 characters" });
    }

    // Ensure the creator is included in members
    const allMembers = [...new Set([req.userId, ...members.filter(Boolean)])];

    const group = new Group({
      name: name.trim(),
      admin: req.userId,
      members: allMembers,
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "-password")
      .populate("members", "-password");

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/groups — get all groups the user belongs to
router.get("/", authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId })
      .populate("admin", "-password")
      .populate("members", "-password")
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/groups/:id/add-members — add members to a group
router.put("/:id/add-members", authMiddleware, async (req, res) => {
  try {
    const { members } = req.body;

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members array is required" });
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only admin can add members
    if (group.admin?.toString() !== req.userId) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    // Add new members (avoid duplicates)
    const existingIds = group.members.filter(Boolean).map((m) => m.toString());
    const newMembers = members.filter((m) => m && !existingIds.includes(m.toString()));
    group.members.push(...newMembers);

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "-password")
      .populate("members", "-password");

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/groups/:id/rename — rename a group (admin only)
router.put("/:id/rename", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Group name cannot be empty" });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ message: "Group name cannot exceed 100 characters" });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin?.toString() !== req.userId) {
      return res.status(403).json({ message: "Only admin can rename group" });
    }

    group.name = name.trim();
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "-password")
      .populate("members", "-password");

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/groups/:id/remove-member — remove a member (admin can remove anyone, member can leave)
router.put("/:id/remove-member", authMiddleware, async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isSelf = memberId.toString() === req.userId.toString();
    const isAdmin = group.admin?.toString() === req.userId.toString();

    // Only admin can remove someone else; anyone can remove themselves (leave)
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: "Only admin can remove other members" });
    }

    // Check if target member is in the group
    const isMember = group.members.some((m) => m && m.toString() === memberId.toString());
    if (!isMember) {
      return res.status(400).json({ message: "User is not a member of this group" });
    }

    // Remove member
    group.members = group.members.filter((m) => m && m.toString() !== memberId.toString());

    // If no members left, delete the group
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(group._id);
      return res.json({ message: "Group deleted as all members left", deleted: true, groupId: group._id });
    }

    // If the admin leaves, reassign admin to the first remaining member
    if (group.admin?.toString() === memberId.toString()) {
      group.admin = group.members[0];
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "-password")
      .populate("members", "-password");

    res.json({
      group: populatedGroup,
      left: isSelf,
      removedMemberId: memberId,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/groups/:id — delete a group (admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin?.toString() !== req.userId) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: "Group deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
