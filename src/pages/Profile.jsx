import { useState, useEffect, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import AppHeader from "../components/AppHeader";

export default function Profile() {
  const { user, updateName, updatePassword, updateAvatar } = useAuth();

  // Join date
  const [createdAt, setCreatedAt] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.created_at) setCreatedAt(data.user.created_at);
    });
  }, []);

  const joinDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "—";

  // ── Edit name ──────────────────────────────────────────────────────────────
  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  const nameDirty = nameInput.trim() !== (user?.name ?? "");

  async function handleSaveName(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    setNameError("");
    if (trimmed === (user?.name ?? "")) return;
    if (!trimmed) return setNameError("Name cannot be empty.");
    if (trimmed.length > 60)
      return setNameError("Name must be 60 characters or fewer.");
    setNameSaving(true);
    const result = await updateName(trimmed);
    setNameSaving(false);
    if (!result.ok) return setNameError(result.error);
    setNameSuccess(true);
    setTimeout(() => setNameSuccess(false), 3000);
  }

  function handleCancelName() {
    setNameInput(user?.name ?? "");
    setNameError("");
    setNameSuccess(false);
  }

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null);

  const avatarSrc =
    localAvatarUrl ??
    (removing ? null : user?.avatar_url) ??
    "/default-avatar.png";

  function handleAvatarClick() {
    if (uploading || removing) return;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5 MB.");
      return;
    }
    const ext = file.name.split(".").pop().toLowerCase();
    const filePath = `${user.id}/avatar.${ext}`;
    setLocalAvatarUrl(URL.createObjectURL(file));
    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      setLocalAvatarUrl(null);
      setAvatarError("Upload failed. Please try again.");
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setLocalAvatarUrl(null);
    const result = await updateAvatar(publicUrl);
    setUploading(false);
    if (!result.ok) setAvatarError("Upload failed. Please try again.");
  }

  async function handleRemovePhoto() {
    if (removing || uploading) return;
    setAvatarError("");
    setRemoving(true);
    try {
      const urlPath = new URL(user.avatar_url).pathname;
      const filename = urlPath.split("/").pop();
      await supabase.storage.from("avatars").remove([`${user.id}/${filename}`]);
    } catch {
      // best-effort storage delete; proceed to clear the DB record regardless
    }
    const result = await updateAvatar(null);
    setRemoving(false);
    if (!result.ok) setAvatarError("Failed to remove photo.");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <title>Profile — Splitmate</title>
      <AppHeader />
      <div className="page py-8 space-y-6">
        {/* ── Profile card ── */}
        <div className="card">
          <div className="flex flex-col items-center text-center gap-5 sm:flex-row sm:items-start sm:text-left">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={handleAvatarClick}
                aria-label="Change profile photo"
                className="relative w-[72px] h-[72px] rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 group"
              >
                {uploading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-full">
                    <Loader2 size={20} className="animate-spin text-ink-soft" />
                  </div>
                )}
                <img
                  src={avatarSrc}
                  alt={user?.name ?? "Profile photo"}
                  className={`w-full h-full object-cover rounded-full transition-opacity${removing ? " opacity-50" : ""}`}
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                {!uploading && (
                  <div className="absolute inset-0 flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <Camera size={16} className="text-white" />
                    </span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="min-w-0 flex flex-col gap-0.5">
              <h2 className="text-lg font-semibold text-ink">{user?.name}</h2>
              <p className="text-sm text-ink-soft">{user?.email}</p>
              <p className="text-sm text-ink-muted">Member since {joinDate}</p>
              {user?.avatar_url && !localAvatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={removing || uploading}
                  className="btn-link mt-1 self-center sm:self-start disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removing ? "Removing…" : "Remove photo"}
                </button>
              )}
            </div>
          </div>
          {avatarError && (
            <p className="text-sm text-neg mt-3" role="alert">
              {avatarError}
            </p>
          )}
        </div>

        {/* ── Edit name card ── */}
        <div className="card">
          <h3 className="text-sm font-semibold text-ink mb-4">Display name</h3>
          <form onSubmit={handleSaveName} noValidate>
            <label className="block">
              <span className="field-label">Display name</span>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setNameError("");
                }}
                maxLength={60}
                className="field"
              />
            </label>
            {nameError && (
              <p className="text-sm text-neg mt-1.5" role="alert">
                {nameError}
              </p>
            )}
            {nameSuccess && (
              <p className="text-sm text-pos mt-1.5" role="status">
                Name updated
              </p>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={handleCancelName}
                disabled={nameSaving}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!nameDirty || nameSaving}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nameSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Change password card ── */}
        <ChangePasswordForm updatePassword={updatePassword} />
      </div>
    </div>
  );
}

function ChangePasswordForm({ updatePassword }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwFieldError, setPwFieldError] = useState(null);
  const [pwError, setPwError] = useState("");
  const [pwBlockError, setPwBlockError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setPwFieldError(null);
    setPwError("");
    setPwBlockError("");

    if (!currentPw) {
      setPwFieldError("current");
      return setPwError("Current password is required.");
    }
    if (!newPw) {
      setPwFieldError("new");
      return setPwError("New password is required.");
    }
    if (newPw.length < 8) {
      setPwFieldError("new");
      return setPwError("Password must be at least 8 characters.");
    }
    if (newPw === currentPw) {
      setPwFieldError("new");
      return setPwError("New password must differ from your current password.");
    }
    if (!confirmPw) {
      setPwFieldError("confirm");
      return setPwError("Please confirm your new password.");
    }
    if (confirmPw !== newPw) {
      setPwFieldError("confirm");
      return setPwError("Passwords do not match.");
    }

    setPwSaving(true);
    const result = await updatePassword({
      currentPassword: currentPw,
      newPassword: newPw,
    });
    setPwSaving(false);
    if (!result.ok) return setPwBlockError(result.error);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwSuccess(true);
    setTimeout(() => setPwSuccess(false), 4000);
  }

  function handleCancel() {
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwFieldError(null);
    setPwError("");
    setPwBlockError("");
    setPwSuccess(false);
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-ink mb-4">Change password</h3>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label className="block">
              <span className="field-label">Current password</span>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                disabled={pwSaving}
                autoComplete="current-password"
                className="field"
              />
            </label>
            {pwFieldError === "current" && (
              <p className="text-sm text-neg mt-1.5" role="alert">
                {pwError}
              </p>
            )}
          </div>
          <div>
            <label className="block">
              <span className="field-label">New password</span>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                disabled={pwSaving}
                autoComplete="new-password"
                className="field"
              />
            </label>
            {pwFieldError === "new" && (
              <p className="text-sm text-neg mt-1.5" role="alert">
                {pwError}
              </p>
            )}
          </div>
          <div>
            <label className="block">
              <span className="field-label">Confirm new password</span>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                disabled={pwSaving}
                autoComplete="new-password"
                className="field"
              />
            </label>
            {pwFieldError === "confirm" && (
              <p className="text-sm text-neg mt-1.5" role="alert">
                {pwError}
              </p>
            )}
          </div>
        </div>
        {pwBlockError && (
          <div
            className="rounded-lg bg-neg-bg text-neg px-3 py-2 text-sm mt-4"
            role="alert"
          >
            {pwBlockError}
          </div>
        )}
        {pwSuccess && (
          <div
            className="rounded-lg bg-pos-bg text-pos px-3 py-2 text-sm mt-4"
            role="status"
          >
            Password updated successfully
          </div>
        )}
        <div className="flex gap-3 justify-end mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={pwSaving}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pwSaving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
