import { useState } from "react";
import { apiClient } from "../config/api";

export default function Sidebar({
  users,
  groups,
  onlineUsers,
  selectedChat,
  chatType,
  onSelectUser,
  onSelectGroup,
  onGroupCreated,
  currentUser,
  onProfileClick,
  onLogout,
}) {
  const [tab, setTab] = useState("users");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [groupError, setGroupError] = useState("");

  // New Chat Search state
  const [showNewChatSearch, setShowNewChatSearch] = useState(false);
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const [dbSearchResults, setDbSearchResults] = useState([]);
  const [dbSearchLoading, setDbSearchLoading] = useState(false);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDbSearchChange = async (e) => {
    const val = e.target.value;
    setDbSearchQuery(val);
    if (!val.trim()) {
      setDbSearchResults([]);
      return;
    }

    setDbSearchLoading(true);
    try {
      const res = await apiClient.get(
        `/api/users/search?q=${encodeURIComponent(val)}`
      );
      setDbSearchResults(res.data);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setDbSearchLoading(false);
    }
  };

  const selectNewChatUser = (u) => {
    setShowNewChatSearch(false);
    setDbSearchQuery("");
    setDbSearchResults([]);
    onSelectUser(u);
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() && selectedMembers.length === 0) {
      setGroupError("Please enter a group name and select members");
      return;
    }
    if (!groupName.trim()) {
      setGroupError("Please enter a group name");
      return;
    }
    if (selectedMembers.length === 0) {
      setGroupError("Please select at least one member");
      return;
    }
    setGroupError("");
    try {
      const res = await apiClient.post(
        "/api/groups",
        { name: groupName, members: selectedMembers }
      );
      onGroupCreated(res.data);
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
    } catch (err) {
      console.error("Error creating group:", err);
      setGroupError(err.response?.data?.message || "Failed to create group");
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
    <div className="w-full md:w-80 bg-workspace border-r border-border-subtle flex flex-col h-full relative z-20 font-sans">
      {/* Header */}
      <div className="p-5 border-b border-border-subtle bg-workspace">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-evergreen flex items-center justify-center text-lime font-display font-black text-base shadow-xs">
              T
            </div>
            <h1 className="text-xl font-extrabold font-display text-ink tracking-tight">
              TalkFlow
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNewChatSearch(!showNewChatSearch)}
              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer border ${
                showNewChatSearch 
                  ? "bg-evergreen text-lime border-evergreen" 
                  : "text-supporting hover:text-ink hover:bg-evergreen/5 border-transparent"
              }`}
              title="Start New Chat"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="p-2 text-supporting hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 cursor-pointer"
              title="Logout"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Current user */}
        <div
          onClick={onProfileClick}
          className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl border border-border-subtle shadow-xs cursor-pointer hover:border-evergreen/30 hover:shadow-sm transition-all duration-200 group"
          title="View profile"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${getAvatarStyle(currentUser?.id)} flex items-center justify-center text-sm font-bold shadow-xs ring-2 ring-evergreen/10`}
            >
              {getInitial(currentUser?.name)}
            </div>
            <div>
              <p className="text-ink text-sm font-bold font-display tracking-tight group-hover:text-evergreen transition-colors">
                {currentUser?.name}
              </p>
              <p className="text-supporting text-xs flex items-center gap-1.5 font-medium mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-evergreen"></span>
                </span>
                Active now
              </p>
            </div>
          </div>
          <div className="p-1 text-supporting group-hover:text-ink rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Search */}
        {!showNewChatSearch && (
          <div className="relative group">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-supporting group-focus-within:text-evergreen transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="sidebar-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-subtle rounded-xl text-ink text-sm placeholder-supporting focus:outline-none focus:ring-2 focus:ring-evergreen/10 focus:border-evergreen transition-all"
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      {showNewChatSearch ? (
        <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
          <div className="relative group">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-supporting group-focus-within:text-evergreen transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={dbSearchQuery}
              onChange={handleDbSearchChange}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-subtle rounded-xl text-ink text-sm placeholder-supporting focus:outline-none focus:ring-2 focus:ring-evergreen/10 focus:border-evergreen transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {dbSearchLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-evergreen border-t-lime animate-spin" />
              </div>
            ) : dbSearchResults.length > 0 ? (
              dbSearchResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => selectNewChatUser(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white border border-transparent hover:border-border-subtle transition-all cursor-pointer group text-left"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${getAvatarStyle(u._id)} flex items-center justify-center text-sm font-bold shadow-xs`}
                  >
                    {getInitial(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-bold font-display truncate">{u.name}</p>
                    <p className="text-supporting text-xs truncate">{u.email}</p>
                  </div>
                </button>
              ))
            ) : dbSearchQuery.trim() ? (
              <p className="text-supporting text-sm text-center py-8">No users found</p>
            ) : (
              <p className="text-supporting text-xs text-center py-8 leading-relaxed">
                Type a name or email address to start a new chat.
              </p>
            )}
          </div>
          
          <button
            onClick={() => {
              setShowNewChatSearch(false);
              setDbSearchQuery("");
              setDbSearchResults([]);
            }}
            className="w-full py-2.5 bg-evergreen/5 hover:bg-evergreen/10 text-ink text-xs font-bold font-display rounded-xl transition-all cursor-pointer border border-border-subtle"
          >
            Cancel & Back
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex p-1 mx-4 mt-3 bg-border-subtle/50 rounded-xl">
            <button
              onClick={() => setTab("users")}
              className={`flex-1 py-2 text-xs font-bold font-display transition-all rounded-lg cursor-pointer ${
                tab === "users"
                  ? "bg-white text-evergreen shadow-xs"
                  : "text-supporting hover:text-ink"
              }`}
            >
              Direct Chats
            </button>
            <button
              onClick={() => setTab("groups")}
              className={`flex-1 py-2 text-xs font-bold font-display transition-all rounded-lg cursor-pointer ${
                tab === "groups"
                  ? "bg-white text-evergreen shadow-xs"
                  : "text-supporting hover:text-ink"
              }`}
            >
              Groups
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {tab === "users" ? (
              <>
                {filteredUsers.map((u) => {
                  const isSelected = selectedChat?._id === u._id && chatType === "user";
                  return (
                    <button
                      key={u._id}
                      onClick={() => onSelectUser(u)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer group text-left relative ${
                        isSelected
                          ? "bg-white border border-border-subtle shadow-sm ring-1 ring-evergreen/10"
                          : "hover:bg-evergreen/5 border border-transparent"
                      }`}
                    >
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-full ${getAvatarStyle(u._id)} flex items-center justify-center text-sm font-bold shadow-xs`}
                        >
                          {getInitial(u.name)}
                        </div>
                        {u.email !== "talkbot@system.local" && (
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-workspace ${
                              onlineUsers.includes(u._id)
                                ? "bg-lime ring-1 ring-evergreen"
                                : "bg-supporting/40"
                            }`}
                          ></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate font-display ${isSelected ? "font-extrabold text-ink" : "font-semibold text-ink"}`}>
                            {u.name}
                          </p>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-lime ring-2 ring-evergreen"></span>
                          )}
                        </div>
                        {u.email === "talkbot@system.local" ? (
                          <p className="text-[11px] font-semibold text-evergreen bg-lime/40 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                            AI Assistant
                          </p>
                        ) : (
                          <p className="text-xs text-supporting font-normal truncate mt-0.5">
                            {onlineUsers.includes(u._id) ? "Active now" : "Offline"}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                    <p className="text-supporting text-xs font-medium">No contacts found</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Create group button */}
                <button
                  onClick={() => setShowCreateGroup(!showCreateGroup)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white border border-border-subtle hover:border-evergreen/30 transition-all duration-200 cursor-pointer mb-2 group shadow-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-evergreen text-lime flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-ink text-sm font-bold font-display">
                    Create New Group
                  </p>
                </button>

                {/* Create group form */}
                {showCreateGroup && (
                  <div className="mx-0.5 mb-3 p-4 bg-white rounded-2xl border border-border-subtle shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Group Name..."
                      className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-xl text-ink text-sm placeholder-supporting focus:outline-none focus:ring-2 focus:ring-evergreen/10 focus:border-evergreen mb-3 transition-all"
                    />
                    {groupError && (
                      <p className="text-amber-700 text-xs font-medium mb-3 px-1 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {groupError}
                      </p>
                    )}
                    <p className="text-supporting text-xs font-bold font-display mb-2 uppercase tracking-wider">Select Members</p>
                    <div className="max-h-36 overflow-y-auto space-y-1 mb-3 scrollbar-hide pr-1">
                      {users.filter((u) => u.email !== "talkbot@system.local").map((u) => (
                        <label
                          key={u._id}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-workspace transition-colors cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(u._id)}
                            onChange={() => toggleMember(u._id)}
                            className="w-4 h-4 rounded border-border-subtle text-evergreen focus:ring-evergreen accent-evergreen cursor-pointer"
                          />
                          <span className="text-ink text-xs font-medium">{u.name}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={createGroup}
                      className="w-full py-2 bg-evergreen hover:bg-evergreen/90 text-lime text-xs font-bold font-display rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Done & Create Group
                    </button>
                  </div>
                )}

                {/* Group list */}
                {filteredGroups.map((g) => {
                  const isSelected = selectedChat?._id === g._id && chatType === "group";
                  return (
                    <button
                      key={g._id}
                      onClick={() => onSelectGroup(g)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer group text-left ${
                        isSelected
                          ? "bg-white border border-border-subtle shadow-sm ring-1 ring-evergreen/10"
                          : "hover:bg-evergreen/5 border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${getAvatarStyle(g._id)} flex items-center justify-center text-sm font-bold shadow-xs`}
                      >
                        {getInitial(g.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate font-display ${isSelected ? "font-extrabold text-ink" : "font-semibold text-ink"}`}>
                            {g.name}
                          </p>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-lime ring-2 ring-evergreen"></span>
                          )}
                        </div>
                        <p className="text-supporting text-xs font-normal mt-0.5">
                          {g.members?.length || 0} participants
                        </p>
                      </div>
                    </button>
                  );
                })}
                {filteredGroups.length === 0 && !showCreateGroup && (
                  <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                    <p className="text-supporting text-xs font-medium">No groups created yet</p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
