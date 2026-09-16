import { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

export default function ChatWindow({
  socket,
  selectedChat,
  chatType,
  messages,
  currentUser,
  onSendMessage,
  onlineUsers,
  onStartCall,
  onGroupInfo,
  onBack,
}) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const onEmojiClick = (emojiObject) => {
    setInput((prev) => prev + emojiObject.emoji);
  };

  // Click-outside listener for emoji picker dismissal (Bug #7 fix)
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!socket) return;
    
    const handleTyping = ({ from }) => {
      if (chatType === "user" && from === selectedChat._id) {
        setIsTyping(true);
      }
    };
    
    const handleStopTyping = ({ from }) => {
      if (chatType === "user" && from === selectedChat._id) {
        setIsTyping(false);
      }
    };

    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, selectedChat, chatType]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (socket && chatType === "user") {
       socket.emit("stop-typing", { to: selectedChat._id, from: currentUser.id });
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
    
    onSendMessage(input);
    setInput("");
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    if (socket && chatType === "user") {
      socket.emit("typing", { to: selectedChat._id, from: currentUser.id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", { to: selectedChat._id, from: currentUser.id });
      }, 1500);
    }
  };

  const getInitial = (name) => name?.charAt(0)?.toUpperCase() || "?";

  const avatarStyles = [
    "bg-evergreen text-lime",
    "bg-evergreen/85 text-workspace",
    "bg-evergreen/75 text-lime",
    "bg-evergreen/90 text-workspace",
    "bg-evergreen/65 text-lime",
    "bg-evergreen text-lime",
  ];

  const getAvatarStyle = (id) => {
    const index =
      id?.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
      avatarStyles.length;
    return avatarStyles[index || 0];
  };

  return (
    <div className="flex flex-col h-full bg-workspace relative overflow-hidden font-sans">
      {/* Header */}
      <div className="px-4 md:px-6 py-3.5 border-b border-border-subtle flex items-center justify-between bg-workspace z-20 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Back button - mobile only */}
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-supporting hover:text-ink hover:bg-evergreen/5 rounded-xl transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="relative">
            <div
              className={`w-11 h-11 rounded-full ${getAvatarStyle(selectedChat._id)} flex items-center justify-center text-sm font-bold shadow-xs ring-2 ring-evergreen/10`}
            >
              {getInitial(selectedChat.name)}
            </div>
            {chatType === "user" && onlineUsers.includes(selectedChat._id) && selectedChat.email !== "talkbot@system.local" && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-workspace bg-lime ring-1 ring-evergreen"></span>
            )}
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold font-display text-ink tracking-tight">
              {selectedChat.name}
            </h2>
            {chatType === "user" ? (
              selectedChat.email === "talkbot@system.local" ? (
                <p className="text-[11px] font-semibold text-evergreen bg-lime/50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                  AI Assistant
                </p>
              ) : (
                <p className="text-xs flex items-center gap-1.5 font-medium mt-0.5 text-supporting">
                  {onlineUsers.includes(selectedChat._id) && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-evergreen"></span>
                    </span>
                  )}
                  {onlineUsers.includes(selectedChat._id) ? "Active now" : "Offline"}
                </p>
              )
            ) : (
              <p className="text-xs text-supporting font-medium mt-0.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-evergreen" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {selectedChat.members?.length || 0} members
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {chatType === "user" && selectedChat?.email !== "talkbot@system.local" && onStartCall && (
            <button
              onClick={onStartCall}
              className="p-2.5 text-evergreen bg-lime hover:bg-lime/90 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5 font-display text-xs font-bold"
              title="Start Video Call"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Call</span>
            </button>
          )}

          {chatType === "group" && onGroupInfo && (
            <button
              onClick={onGroupInfo}
              className="p-2.5 text-ink bg-white border border-border-subtle hover:bg-evergreen/5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5 font-display text-xs font-bold"
              title="Group Details"
            >
              <svg
                className="w-4.5 h-4.5 text-supporting"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Info</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 relative z-10 bg-workspace">
        {messages.map((m, i) => {
          const msgSenderId = typeof m.senderId === "object" && m.senderId !== null ? m.senderId._id : m.senderId;
          const isOwn = Boolean(msgSenderId && currentUser?.id && msgSenderId.toString() === currentUser.id.toString());
          return (
            <div
              key={m._id || i}
              className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[82%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${
                  isOwn
                    ? "bg-evergreen text-workspace rounded-tr-xs"
                    : "bg-white text-ink border border-border-subtle rounded-tl-xs"
                }`}
              >
                {!isOwn && chatType === "group" && (
                  <p className="text-xs text-evergreen font-bold font-display mb-1">
                    {m.senderName}
                  </p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">{m.content}</p>
                <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                  <p className={`text-[10px] font-medium ${isOwn ? 'text-workspace/60' : 'text-supporting'}`}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : ""}
                  </p>
                  {isOwn && chatType === "user" && (
                    <span className="text-[12px] leading-none">
                      {m.status === "read" ? (
                        <span className="text-lime font-bold">✓✓</span>
                      ) : m.status === "delivered" ? (
                        <span className="text-workspace/70">✓✓</span>
                      ) : (
                        <span className="text-workspace/40">✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs border border-border-subtle flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-supporting rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1.5 h-1.5 bg-supporting rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1.5 h-1.5 bg-supporting rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="relative bg-workspace border-t border-border-subtle/60">
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full right-4 mb-3 z-50 animate-in slide-in-from-bottom-2 duration-150 shadow-xl rounded-2xl overflow-hidden border border-border-subtle">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="light"
              searchDisabled
              skinTonesDisabled
              height={350}
            />
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="p-3 md:p-4 flex gap-2 relative z-20"
        >
          <div className="flex-1 relative flex items-center bg-white border border-border-subtle rounded-2xl shadow-xs focus-within:ring-2 focus-within:ring-evergreen/10 focus-within:border-evergreen transition-all">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 text-supporting hover:text-evergreen transition-colors ml-1 cursor-pointer"
              title="Add Emoji"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 py-3 px-2 bg-transparent text-ink placeholder-supporting text-sm focus:outline-none font-sans"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="mr-1.5 p-2.5 bg-lime hover:bg-lime/90 text-evergreen rounded-xl transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              title="Send Message"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
