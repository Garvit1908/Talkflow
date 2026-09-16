const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const dns = require("dns");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();


// Use Google DNS and force IPv4 to fix Render's ENETUNREACH SMTP issue
dns.setServers(["8.8.8.8", "8.8.4.4"]);
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const groupRoutes = require("./routes/groups");
const messageRoutes = require("./routes/messages");
const Message = require("./models/Message");
const Group = require("./models/Group");
const User = require("./models/User");
const { handleTalkBotMessage, getTalkBotId } = require("./services/talkbot");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim().replace(/\/$/, ""))
  : [
      "http://localhost:5173",
      "https://chatap-six.vercel.app"
    ];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Generic API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again after 15 minutes" },
});

// Stricter rate limiter for auth & OTP endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login/registration attempts, please try again after 15 minutes" },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests, please try again after 15 minutes" },
});

// Middleware
app.use(helmet());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) and listed origins
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// Rate limits applied to specific routes
app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/auth/send-otp", otpLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);


// Track online users: userId -> socketId
const onlineUsers = new Map();
// Track active calls: socketId -> targetUserId
const activeCalls = new Map();

// Socket.io Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;

    // Cache user's name
    const user = await User.findById(socket.userId).select("name");
    socket.userName = user ? user.name : "Unknown";

    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.io events
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "User:", socket.userId);

  // Mark user online
  onlineUsers.set(socket.userId, socket.id);
  io.emit("online-users", Array.from(onlineUsers.keys()));

  // Mark messages as delivered for this user
  Message.updateMany(
    { receiverId: socket.userId, status: "sent" },
    { $set: { status: "delivered" } }
  ).catch((err) => console.error("Error marking delivered:", err));

  // Send message
  socket.on("send-message", async (data) => {
    const { receiverId, content } = data;
    const senderId = socket.userId;

    // Validate message content
    if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 5000) {
      return;
    }

    try {
      // Determine initial status based on if receiver is online
      const receiverSocketId = onlineUsers.get(receiverId);
      const initialStatus = receiverSocketId ? "delivered" : "sent";

      // Save message to MongoDB
      const message = new Message({ senderId, receiverId, content, status: initialStatus });
      await message.save();

      // Emit to receiver if online
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", {
          _id: message._id,
          senderId,
          receiverId,
          content,
          status: initialStatus,
          createdAt: message.createdAt,
        });
      }

      // Confirm to sender
      socket.emit("message-sent", {
        _id: message._id,
        senderId,
        receiverId,
        content,
        status: initialStatus,
        createdAt: message.createdAt,
      });

      // --- AI TalkBot Logic ---
      const botId = await getTalkBotId();
      if (botId && receiverId === botId.toString()) {
        handleTalkBotMessage(socket, io, onlineUsers, content);
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // Typing indicators
  socket.on("typing", (data) => {
    const receiverSocketId = onlineUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { from: socket.userId });
    }
  });

  socket.on("stop-typing", (data) => {
    const receiverSocketId = onlineUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop-typing", { from: socket.userId });
    }
  });

  // Read receipts
  socket.on("mark-messages-read", async (data) => {
    const { senderId } = data;
    const receiverId = socket.userId;
    try {
      await Message.updateMany(
        { senderId, receiverId, status: { $ne: "read" } },
        { $set: { status: "read" } }
      );
      
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messages-read", {
          byUserId: receiverId
        });
      }
    } catch (err) {
      console.error("Error marking messages read:", err);
    }
  });

  // Video call: caller signals the target user
  socket.on("call-user", (data) => {
    if (!data?.to) return;
    activeCalls.set(socket.id, data.to);
    const receiverSocketId = onlineUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        signal: data.signal,
        from: socket.userId,
        name: socket.userName,
      });
    }
  });

  // Video call: callee accepts the call
  socket.on("accept-call", (data) => {
    if (!data?.to) return;
    activeCalls.set(socket.id, data.to);
    const callerSocketId = onlineUsers.get(data.to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", {
        signal: data.signal,
      });
    }
  });

  // ICE candidate exchange
  socket.on("ice-candidate", (data) => {
    const targetSocketId = onlineUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice-candidate", {
        candidate: data.candidate,
      });
    }
  });

  // Video call: end active call
  socket.on("end-call", (data) => {
    activeCalls.delete(socket.id);
    if (!data?.to) return;
    const targetSocketId = onlineUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call-ended");
    }
  });

  // Video call: reject incoming call
  socket.on("reject-call", (data) => {
    activeCalls.delete(socket.id);
    if (!data?.to) return;
    const targetSocketId = onlineUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call-rejected");
    }
  });

  // Group chat: join group room
  socket.on("join-group", async (groupId) => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === socket.userId)) {
        console.warn(`Unauthorized join-group attempt by ${socket.userId} to group ${groupId}`);
        return;
      }
      socket.join(`group-${groupId}`);
      console.log(`Socket ${socket.id} (User: ${socket.userId}) joined group ${groupId}`);
    } catch (err) {
      console.error("Error joining group socket:", err);
    }
  });

  // Group chat: send message to group
  socket.on("send-group-message", async (data) => {
    const { groupId, content } = data;
    const senderId = socket.userId;
    const senderName = socket.userName;

    // Validate message content
    if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 5000) {
      return;
    }

    try {
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === senderId)) {
        console.warn(`Unauthorized send-group-message attempt by ${senderId} to group ${groupId}`);
        return;
      }

      const message = new Message({ senderId, groupId, content });
      await message.save();

      // Broadcast to all group members in the room EXCEPT the sender
      socket.to(`group-${groupId}`).emit("receive-group-message", {
        _id: message._id,
        senderId,
        groupId,
        content,
        senderName,
        createdAt: message.createdAt,
      });

      // Confirm to sender separately
      socket.emit("group-message-sent", {
        _id: message._id,
        senderId,
        groupId,
        content,
        senderName,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error("Error saving group message:", error);
    }
  });

  // User disconnects
  socket.on("disconnect", () => {
    // If user was in an active call, inform the peer immediately
    const peerUserId = activeCalls.get(socket.id);
    if (peerUserId) {
      const peerSocketId = onlineUsers.get(peerUserId);
      if (peerSocketId) {
        io.to(peerSocketId).emit("call-ended");
      }
      activeCalls.delete(socket.id);
    }

    // Only mark user offline if this was their active socket
    if (onlineUsers.get(socket.userId) === socket.id) {
      onlineUsers.delete(socket.userId);
      io.emit("online-users", Array.from(onlineUsers.keys()));
    }
    console.log(`User ${socket.userId} disconnected`);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    // Validate critical environment variables in production
    if (isProduction) {
      if (!process.env.MONGO_URI) {
        console.error("FATAL ERROR: MONGO_URI is not defined in production env!");
        process.exit(1);
      }
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret123") {
        console.error("FATAL ERROR: JWT_SECRET is undefined or insecure ('supersecret123') in production env!");
        process.exit(1);
      }
    }

    let mongoUri = process.env.MONGO_URI;
    
    // Fallback to in-memory server ONLY in development/local env
    if (!isProduction && (!mongoUri || mongoUri.includes("127.0.0.1") || mongoUri.includes("localhost"))) {
      console.log("Starting in-memory MongoDB database...");
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
    } else if (!mongoUri) {
      console.error("FATAL ERROR: MONGO_URI is not defined!");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB");

    // Initialize TalkBot with hashed password
    let botUser = await User.findOne({ email: "talkbot@system.local" });
    if (!botUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedBotPwd = await bcrypt.hash(`bot_${Date.now()}_${Math.random()}`, salt);
      botUser = new User({
        name: "🤖 TalkBot (AI)",
        email: "talkbot@system.local",
        password: hashedBotPwd,
      });
      await botUser.save();
    }
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

startServer();
