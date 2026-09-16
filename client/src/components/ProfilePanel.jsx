import { useState, useEffect } from "react";
import { apiClient } from "../config/api";

export default function ProfilePanel({ currentUser, onClose, onUpdateUser }) {
  const [profile, setProfile] = useState(currentUser || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.name || "");

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(currentUser?.bio || "");

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

  const getInitial = (name) => name?.charAt(0)?.toUpperCase() || "?";

  // Fetch full profile info on open
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/api/users/me");
        setProfile(res.data);
        setNameInput(res.data.name || "");
        setBioInput(res.data.bio || "");
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      setError("Name cannot be empty");
      return;
    }
    if (nameInput.trim().length > 50) {
      setError("Name cannot exceed 50 characters");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const res = await apiClient.put("/api/users/me", { name: nameInput.trim() });
      setProfile(res.data);
      if (onUpdateUser) onUpdateUser(res.data);
      setIsEditingName(false);
      setSuccessMessage("Name updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    if (bioInput.length > 150) {
      setError("Bio cannot exceed 150 characters");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const res = await apiClient.put("/api/users/me", { bio: bioInput.trim() });
      setProfile(res.data);
      if (onUpdateUser) onUpdateUser(res.data);
      setIsEditingBio(false);
      setSuccessMessage("Bio updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update bio");
    } finally {
      setSaving(false);
    }
  };

  const memberSinceFormatted = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-workspace border border-border-subtle rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-evergreen/5 rounded-xl border border-border-subtle text-evergreen">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-display text-ink tracking-tight">Account Profile</h2>
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
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-lime/40 border border-evergreen/20 rounded-xl text-evergreen text-xs font-bold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-evergreen border-t-lime animate-spin" />
            <p className="text-supporting text-xs font-medium">Loading profile...</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4 relative z-10">
            {/* Avatar block */}
            <div className="flex flex-col items-center pb-2">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full ${getAvatarStyle(profile._id || profile.id)} flex items-center justify-center text-2xl font-black shadow-md ring-4 ring-evergreen/10`}
                >
                  {getInitial(profile.name)}
                </div>
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-workspace bg-lime ring-1 ring-evergreen" />
              </div>
              <p className="mt-3 text-xs text-supporting font-medium tracking-wide">
                Signed in to TalkFlow
              </p>
            </div>

            {/* Display Name */}
            <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold font-display text-supporting uppercase tracking-wider">
                  Display Name
                </label>
                {!isEditingName && (
                  <button
                    onClick={() => {
                      setNameInput(profile.name || "");
                      setIsEditingName(true);
                      setError("");
                    }}
                    className="text-xs text-evergreen hover:underline font-bold font-display flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {isEditingName ? (
                <div className="space-y-3 mt-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={50}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 bg-workspace border border-border-subtle rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-evergreen/10 focus:border-evergreen transition-all"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setNameInput(profile.name || "");
                        setError("");
                      }}
                      className="px-3 py-1.5 text-xs text-supporting hover:text-ink rounded-lg hover:bg-evergreen/5 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveName}
                      disabled={saving}
                      className="px-4 py-1.5 bg-evergreen hover:bg-evergreen/90 text-lime text-xs font-bold font-display rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-ink text-sm font-bold font-display">{profile.name}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold font-display text-supporting uppercase tracking-wider">
                  Email Address
                </label>
                <span className="text-[10px] text-supporting font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Verified & Locked
                </span>
              </div>
              <p className="text-ink text-sm font-medium">{profile.email}</p>
            </div>

            {/* Bio / About */}
            <div className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold font-display text-supporting uppercase tracking-wider">
                  About / Bio
                </label>
                {!isEditingBio && (
                  <button
                    onClick={() => {
                      setBioInput(profile.bio || "");
                      setIsEditingBio(true);
                      setError("");
                    }}
                    className="text-xs text-evergreen hover:underline font-bold font-display flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {isEditingBio ? (
                <div className="space-y-3 mt-2">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={150}
                    rows={3}
                    placeholder="Write something about yourself..."
                    className="w-full px-3.5 py-2.5 bg-workspace border border-border-subtle rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-evergreen/10 focus:border-evergreen transition-all resize-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-supporting">
                      {bioInput.length} / 150 characters
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsEditingBio(false);
                          setBioInput(profile.bio || "");
                          setError("");
                        }}
                        className="px-3 py-1.5 text-xs text-supporting hover:text-ink rounded-lg hover:bg-evergreen/5 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBio}
                        disabled={saving}
                        className="px-4 py-1.5 bg-evergreen hover:bg-evergreen/90 text-lime text-xs font-bold font-display rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`text-sm leading-relaxed ${profile.bio ? "text-ink" : "text-supporting italic"}`}>
                  {profile.bio || "No bio added yet. Click edit to introduce yourself!"}
                </p>
              )}
            </div>

            {/* Member Since Footer */}
            <div className="pt-2 flex items-center justify-between text-xs text-supporting">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-evergreen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Member since
              </span>
              <span className="font-semibold text-ink">{memberSinceFormatted}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
