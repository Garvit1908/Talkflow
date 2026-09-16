import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { apiClient } from "../config/api";

import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import VideoCall from "../components/VideoCall";
import ProfilePanel from "../components/ProfilePanel";
import GroupInfoPanel from "../components/GroupInfoPanel";

export default function Chat() {
  const { user, token, logout, updateUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState("user"); // "user" or "group"
  const [messages, setMessages] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callData, setCallData] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const selectedChatRef = useRef(selectedChat);
  const chatTypeRef = useRef(chatType);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
    chatTypeRef.current = chatType;
  }, [selectedChat, chatType]);

  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const fetchActiveUsers = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching active users:", err);
    }
  }, []);

  // Fetch users and groups initially
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, groupsRes] = await Promise.all([
          apiClient.get("/api/users"),
          apiClient.get("/api/groups"),
        ]);
        setUsers(usersRes.data);
        setGroups(groupsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [token]);

  // Fetch message history when chat is selected
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        let url = "";
        if (chatType === "user") {
          url = `/api/messages/${selectedChat._id}`;
        } else {
          url = `/api/messages/group/${selectedChat._id}`;
        }
        const res = await apiClient.get(url);
        let data = res.data;
        if (chatType === "user") {
          data = data.map(m => m.senderId === selectedChat._id ? { ...m, status: "read" } : m);
        }
        setMessages(data);

        // Mark messages as read AFTER fetching (fixes race condition - Bug #10)
        if (socket && chatType === "user") {
          socket.emit("mark-messages-read", { senderId: selectedChat._id, receiverId: user.id });
        }
      } catch {
        // No message history endpoint yet — start fresh
        setMessages([]);
      }
    };
    fetchMessages();
  }, [selectedChat, chatType, token, socket, user.id]);

  // Socket listeners for messages
  useEffect(() => {
    if (!socket) return;

    socket.on("receive-message", (msg) => {
      // Re-fetch user list if sender isn't in active users sidebar
      if (msg.senderId && !usersRef.current.some(u => u._id === msg.senderId)) {
        fetchActiveUsers();
      }

      const activeChat = selectedChatRef.current;
      const activeType = chatTypeRef.current;

      if (
        activeChat &&
        activeType === "user" &&
        msg.senderId === activeChat._id
      ) {
        setMessages((prev) => [...prev, { ...msg, status: "read" }]);
        socket.emit("mark-messages-read", { senderId: msg.senderId, receiverId: user.id });
      }
      // Messages from non-active chats are stored in DB and will appear when user clicks that chat
    });

    socket.on("message-sent", (msg) => {
      // Bug #13 fix: Only append if message belongs to the currently active chat
      const activeChat = selectedChatRef.current;
      const activeType = chatTypeRef.current;
      if (activeChat && activeType === "user" && msg.receiverId === activeChat._id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("messages-read", ({ byUserId }) => {
      // Bug #5 fix: Only update messages for the currently active chat
      const activeChat = selectedChatRef.current;
      const activeType = chatTypeRef.current;
      if (activeChat && activeType === "user" && activeChat._id === byUserId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.receiverId === byUserId ? { ...m, status: "read" } : m
          )
        );
      }
    });

    socket.on("receive-group-message", (msg) => {
      const activeChat = selectedChatRef.current;
      const activeType = chatTypeRef.current;

      if (
        activeChat &&
        activeType === "group" &&
        msg.groupId === activeChat._id
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Bug #3 fix: Listen for server-confirmed group message (replaces optimistic add)
    socket.on("group-message-sent", (msg) => {
      const activeChat = selectedChatRef.current;
      const activeType = chatTypeRef.current;
      if (activeChat && activeType === "group" && msg.groupId === activeChat._id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Video call listeners
    socket.on("incoming-call", (data) => {
      setIncomingCall(data);
    });

    socket.on("call-rejected", () => {
      setCallActive(false);
      setCallData(null);
    });

    socket.on("call-ended", () => {
      setCallActive(false);
      setCallData(null);
    });

    return () => {
      socket.off("receive-message");
      socket.off("message-sent");
      socket.off("messages-read");
      socket.off("receive-group-message");
      socket.off("group-message-sent");
      socket.off("incoming-call");
      socket.off("call-rejected");
      socket.off("call-ended");
    };
  }, [socket, user, fetchActiveUsers]);


  // Join group rooms when groups are loaded
  useEffect(() => {
    if (!socket || groups.length === 0) return;
    groups.forEach((g) => socket.emit("join-group", g._id));
  }, [socket, groups]);

  const sendMessage = (content) => {
    if (!socket || !content.trim()) return;

    if (chatType === "user") {
      socket.emit("send-message", {
        senderId: user.id,
        receiverId: selectedChat._id,
        content,
      });
    } else {
      socket.emit("send-group-message", {
        senderId: user.id,
        groupId: selectedChat._id,
        content,
        senderName: user.name,
      });
      // Bug #3 fix: No optimistic add — wait for "group-message-sent" from server
    }
  };

  const startCall = () => {
    if (!selectedChat || selectedChat.email === "talkbot@system.local") return;
    setCallActive(true);
    setCallData({ to: selectedChat, initiator: true });
  };

  const acceptCall = () => {
    setCallActive(true);
    setCallData({
      to: incomingCall.from,
      initiator: false,
      incomingSignal: incomingCall.signal,
      callerName: incomingCall.name,
    });
    setIncomingCall(null);
  };

  const declineCall = () => {
    if (socket && incomingCall) {
      socket.emit("reject-call", { to: incomingCall.from });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    setCallActive(false);
    setCallData(null);
  };

  const handleSelectUser = (u) => {
    if (!users.some((user) => user._id === u._id)) {
      setUsers((prev) => [u, ...prev]);
    }
    setSelectedChat(u);
    setChatType("user");
    setMessages([]);
    setMobileChatOpen(true);
  };

  const handleSelectGroup = (g) => {
    setSelectedChat(g);
    setChatType("group");
    setMessages([]);
    setMobileChatOpen(true);
  };

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
    if (socket) socket.emit("join-group", newGroup._id);
  };

  const handleGroupUpdated = (updatedGroup) => {
    setGroups((prev) =>
      prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g))
    );
    if (selectedChat?._id === updatedGroup._id) {
      setSelectedChat(updatedGroup);
    }
  };

  const handleGroupDeleted = (groupId) => {
    setGroups((prev) => prev.filter((g) => g._id !== groupId));
    if (selectedChat?._id === groupId) {
      setSelectedChat(null);
      setMessages([]);
      setMobileChatOpen(false);
    }
  };

  const handleLeaveGroup = (groupId) => {
    setGroups((prev) => prev.filter((g) => g._id !== groupId));
    if (selectedChat?._id === groupId) {
      setSelectedChat(null);
      setMessages([]);
      setMobileChatOpen(false);
    }
  };

  return (
    <div className="h-screen flex bg-workspace text-ink font-sans overflow-hidden antialiased selection:bg-lime selection:text-evergreen">
      {/* Sidebar */}
      <div className={`${mobileChatOpen ? 'hidden' : 'flex'} md:flex w-full md:w-auto h-full`}>
        <Sidebar
          users={users}
          groups={groups}
          onlineUsers={onlineUsers}
          selectedChat={selectedChat}
          chatType={chatType}
          onSelectUser={handleSelectUser}
          onSelectGroup={handleSelectGroup}
          onGroupCreated={handleGroupCreated}
          currentUser={user}
          onProfileClick={() => setShowProfile(true)}
          onLogout={logout}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`${mobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full bg-workspace`}>
        {selectedChat ? (
          <ChatWindow
            socket={socket}
            selectedChat={selectedChat}
            chatType={chatType}
            messages={messages}
            currentUser={user}
            onSendMessage={sendMessage}
            onlineUsers={onlineUsers}
            onStartCall={chatType === "user" ? startCall : null}
            onGroupInfo={chatType === "group" ? () => setShowGroupInfo(true) : null}
            onBack={() => setMobileChatOpen(false)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-workspace relative overflow-hidden p-6">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#182522 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
            <div className="text-center relative z-10 max-w-md animate-in fade-in duration-500">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-evergreen text-lime flex items-center justify-center shadow-xl ring-4 ring-evergreen/10 transition-transform hover:scale-105 duration-300">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-extrabold text-ink mb-3 tracking-tight">
                Your Conversations
              </h3>
              <p className="text-supporting text-sm leading-relaxed mb-6 font-normal">
                Select a user or group from the sidebar to chat, exchange updates, or start high-definition audio & video calls.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-evergreen/5 border border-border-subtle text-xs font-medium text-evergreen">
                <span className="w-2 h-2 rounded-full bg-lime ring-2 ring-evergreen/20"></span>
                End-to-End Encrypted & Real-Time
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incoming call notification */}
      {incomingCall && !callActive && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="relative bg-workspace border border-border-subtle rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 w-full max-w-sm">
            <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-evergreen text-lime flex items-center justify-center shadow-lg ring-4 ring-lime/30">
              <svg
                className="w-10 h-10 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            
            <h3 className="font-display text-2xl font-bold text-ink mb-1">
              {incomingCall.name}
            </h3>
            <p className="text-supporting text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">Incoming video call...</p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={acceptCall}
                className="flex-1 py-3 bg-lime hover:bg-lime/90 text-evergreen rounded-xl font-display font-bold text-sm tracking-wide transition-all cursor-pointer shadow-sm hover:shadow"
              >
                Accept
              </button>
              <button
                onClick={declineCall}
                className="flex-1 py-3 bg-evergreen hover:bg-evergreen/90 text-workspace rounded-xl font-display font-semibold text-sm tracking-wide transition-all cursor-pointer shadow-sm hover:shadow"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video call overlay */}
      {callActive && callData && (
        <VideoCall
          socket={socket}
          callData={callData}
          currentUser={user}
          onEndCall={endCall}
        />
      )}

      {/* Profile Modal / Slide-over */}
      {showProfile && (
        <ProfilePanel
          currentUser={user}
          onClose={() => setShowProfile(false)}
          onUpdateUser={updateUser}
        />
      )}

      {/* Group Info Modal / Slide-over */}
      {showGroupInfo && selectedChat && chatType === "group" && (
        <GroupInfoPanel
          group={selectedChat}
          currentUser={user}
          onlineUsers={onlineUsers}
          allUsers={users}
          onClose={() => setShowGroupInfo(false)}
          onGroupUpdated={handleGroupUpdated}
          onGroupDeleted={handleGroupDeleted}
          onLeaveGroup={handleLeaveGroup}
        />
      )}
    </div>
  );
}
