import { useState, useEffect } from "react";
import { apiClient } from "../config/api";

export default function GroupInfoPanel({
  group,
  currentUser,
  onlineUsers,
  allUsers,
  onClose,
  onGroupUpdated,
  onGroupDeleted,
  onLeaveGroup,
}) {
  const [currentGroup, setCurrentGroup] = useState(group);
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState(group?.name || "");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    setCurrentGroup(group);
    setGroupNameInput(group?.name || "");
  }, [group]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const adminId =
    typeof currentGroup?.admin === "object" && currentGroup?.admin !== null
      ? currentGroup.admin?._id
      : currentGroup?.admin;
  const isAdmin = Boolean(
    currentUser?.id && adminId && currentUser.id.toString() === adminId.toString()
  );

  const avatarStyles = [
    "bg-evergreen text-lime",
    "bg-evergreen/85 text-workspace",
    "bg-evergreen/75 text-lime",
    "bg-evergreen/90 text-workspace",
    "bg-evergreen/65 text-lime",
    "bg-evergreen text-lime",
  ];

  const getColor = (id) => {
    const index =
      id?.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
      avatarStyles.length;
    return avatarStyles[index || 0];
  };

  const getInitial = (name) => name?.charAt(0)?.toUpperCase() || "?";

  // Rename group
  const handleRenameGroup = async () => {
    if (!groupNameInput.trim()) {
      setError("Group name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await apiClient.put(`/api/groups/${currentGroup._id}/rename`, {
        name: groupNameInput.trim(),
      });
      setCurrentGroup(res.data);
      if (onGroupUpdated) onGroupUpdated(res.data);
      setIsEditingName(false);
      setSuccessMessage("Group renamed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to rename group");
    } finally {
      setLoading(false);
    }
  };

  // Add members
  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) {
      setError("Please select at least one member to add");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await apiClient.put(
        `/api/groups/${currentGroup._id}/add-members`,
        { members: selectedNewMembers }
      );
      setCurrentGroup(res.data);
      if (onGroupUpdated) onGroupUpdated(res.data);
      setSelectedNewMembers([]);
      setShowAddMembers(false);
      setSuccessMessage("Members added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add members");
    } finally {
      setLoading(false);
    }
  };

  // Remove member (Admin action)
  const handleRemoveMember = async (memberId) => {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient.put(
        `/api/groups/${currentGroup._id}/remove-member`,
        { memberId }
      );

      if (res.data.deleted) {
        if (onGroupDeleted) onGroupDeleted(currentGroup._id);
        onClose();
        return;
      }

      setCurrentGroup(res.data.group);
      if (onGroupUpdated) onGroupUpdated(res.data.group);
      setSuccessMessage("Member removed");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient.put(
        `/api/groups/${currentGroup._id}/remove-member`,
        { memberId: currentUser.id }
      );

      if (res.data.deleted) {
        if (onGroupDeleted) onGroupDeleted(currentGroup._id);
      } else {
        if (onLeaveGroup) onLeaveGroup(currentGroup._id);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave group");
      setLoading(false);
    }
  };

  // Delete group (Admin action)
  const handleDeleteGroup = async () => {
    try {
      setLoading(true);
      setError("");
      await apiClient.delete(`/api/groups/${currentGroup._id}`);
      if (onGroupDeleted) onGroupDeleted(currentGroup._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete group");
      setLoading(false);
    }
  };

  // Existing member IDs
  const existingMemberIds = (currentGroup?.members || [])
    .filter(Boolean)
    .map((m) => (typeof m === "object" && m !== null ? m._id?.toString() : m?.toString()))
    .filter(Boolean);

  // Available users to add (exclude bot and existing members)
  const availableUsersToAdd = (allUsers || []).filter(
    (u) =>
      u &&
      !existingMemberIds.includes(u._id?.toString()) &&
      u.email !== "talkbot@system.local" &&
      u._id?.toString() !== currentUser?.id?.toString()
  );

  const toggleSelectNewMember = (userId) => {
    setSelectedNewMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const createdDateFormatted = currentGroup.createdAt
    ? new Date(currentGroup.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-workspace border border-border-subtle rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-evergreen/5 rounded-xl border border-border-subtle text-evergreen">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-display text-ink tracking-tight">Group Info</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-supporting hover:text-ink hover:bg-evergreen/5 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-lime/40 border border-evergreen/20 rounded-xl text-evergreen text-xs font-bold flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-1 mt-4 space-y-5 scrollbar-hide flex-1">
          {/* Group Avatar + Name Card */}
          <div className="flex flex-col items-center p-5 bg-white border border-border-subtle rounded-2xl shadow-xs">
            <div
              className={`w-16 h-16 rounded-2xl ${getColor(currentGroup._id)} flex items-center justify-center text-2xl font-black shadow-xs ring-4 ring-evergreen/10 mb-3`}
            >
              {getInitial(currentGroup.name)}
            </div>

            {isEditingName ? (
              <div className="w-full space-y-2 mt-2">
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-xl text-ink text-center text-base font-bold font-display focus:outline-none focus:ring-2 focus:ring-evergreen/10 focus:border-evergreen"
                  autoFocus
                />
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setGroupNameInput(currentGroup.name || "");
                      setError("");
                    }}
                    className="px-3 py-1 text-xs text-supporting hover:text-ink rounded-lg hover:bg-evergreen/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameGroup}
                    disabled={loading}
                    className="px-4 py-1 bg-evergreen hover:bg-evergreen/90 text-lime text-xs font-bold font-display rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-display text-ink tracking-tight text-center">
                  {currentGroup.name}
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-supporting hover:text-evergreen rounded-lg transition-colors cursor-pointer"
                    title="Rename group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5 mt-2 text-xs text-supporting">
              <span className="px-2.5 py-0.5 rounded-full bg-evergreen/5 text-evergreen font-semibold border border-border-subtle">
                {currentGroup.members?.length || 0} Members
              </span>
              {createdDateFormatted && (
                <span>Created {createdDateFormatted}</span>
              )}
            </div>
          </div>

          {/* Members Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="text-xs font-bold font-display text-supporting uppercase tracking-wider">
                Group Members ({currentGroup.members?.length || 0})
              </h4>
              {isAdmin && availableUsersToAdd.length > 0 && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="text-xs text-evergreen hover:underline font-bold font-display flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={showAddMembers ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
                  </svg>
                  {showAddMembers ? "Cancel" : "Add Member"}
                </button>
              )}
            </div>

            {/* Add members dropdown / picker */}
            {showAddMembers && (
              <div className="mb-4 p-4 bg-white border border-border-subtle rounded-2xl shadow-xs animate-in slide-in-from-top-2 duration-150">
                <p className="text-xs font-bold font-display text-ink mb-2.5">
                  Select users to add:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-hide pr-1 mb-3">
                  {availableUsersToAdd.map((u) => (
                    <label
                      key={u._id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-workspace cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full ${getColor(u._id)} flex items-center justify-center text-xs font-bold shadow-xs`}
                        >
                          {getInitial(u.name)}
                        </div>
                        <div>
                          <p className="text-xs text-ink font-bold font-display">{u.name}</p>
                          <p className="text-[10px] text-supporting truncate max-w-45">{u.email}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedNewMembers.includes(u._id)}
                        onChange={() => toggleSelectNewMember(u._id)}
                        className="w-4 h-4 rounded border-border-subtle text-evergreen focus:ring-evergreen accent-evergreen cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleAddMembers}
                  disabled={loading || selectedNewMembers.length === 0}
                  className="w-full py-2 bg-evergreen hover:bg-evergreen/90 text-lime text-xs font-bold font-display rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Adding..." : `Add Selected (${selectedNewMembers.length})`}
                </button>
              </div>
            )}

            {/* Member List */}
            <div className="space-y-1.5">
              {(currentGroup?.members || []).filter(Boolean).map((m) => {
                const memberId = typeof m === "object" && m !== null ? m._id?.toString() : m?.toString();
                const memberName = typeof m === "object" && m !== null ? m.name : "Member";
                const memberEmail = typeof m === "object" && m !== null ? m.email : "";
                const isMemberAdmin = Boolean(memberId && adminId && memberId.toString() === adminId.toString());
                const isSelf = Boolean(memberId && currentUser?.id && memberId.toString() === currentUser.id.toString());
                const isOnline = onlineUsers.includes(memberId);

                return (
                  <div
                    key={memberId}
                    className="flex items-center justify-between p-3 bg-white hover:bg-workspace border border-border-subtle rounded-2xl transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-9 h-9 rounded-full ${getColor(memberId)} flex items-center justify-center text-xs font-bold shadow-xs`}
                        >
                          {getInitial(memberName)}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-workspace ${
                            isOnline
                              ? "bg-lime ring-1 ring-evergreen"
                              : "bg-supporting/40"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-ink text-sm font-bold font-display">
                            {memberName}
                          </p>
                          {isSelf && (
                            <span className="text-[10px] text-supporting bg-evergreen/5 px-1.5 py-0.5 rounded-md font-medium">
                              You
                            </span>
                          )}
                          {isMemberAdmin && (
                            <span className="text-[10px] bg-lime/50 text-evergreen border border-evergreen/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-supporting text-xs truncate max-w-40 md:max-w-55">
                          {memberEmail}
                        </p>
                      </div>
                    </div>

                    {/* Admin control: Remove member */}
                    {isAdmin && !isSelf && (
                      <button
                        onClick={() => handleRemoveMember(memberId)}
                        className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-all cursor-pointer font-medium"
                        title={`Remove ${memberName} from group`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-3 border-t border-border-subtle space-y-2">
            {/* Leave Group Button */}
            {!confirmLeave ? (
              <button
                onClick={() => setConfirmLeave(true)}
                className="w-full py-2.5 bg-white hover:bg-red-50 text-red-600 border border-border-subtle hover:border-red-200 rounded-xl text-xs font-bold font-display transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Leave Group
              </button>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <p className="text-xs text-red-700 font-medium text-center">
                  Are you sure you want to leave this group?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="flex-1 py-1.5 text-xs text-supporting hover:text-ink bg-white rounded-lg transition-colors cursor-pointer border border-border-subtle"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeaveGroup}
                    disabled={loading}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Leaving..." : "Yes, Leave"}
                  </button>
                </div>
              </div>
            )}

            {/* Admin Delete Group Button */}
            {isAdmin && (
              !confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Group for All
                </button>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-xs text-red-700 font-medium text-center">
                    Permanently delete this group for all members?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-1.5 text-xs text-supporting hover:text-ink bg-white rounded-lg transition-colors cursor-pointer border border-border-subtle"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteGroup}
                      disabled={loading}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
