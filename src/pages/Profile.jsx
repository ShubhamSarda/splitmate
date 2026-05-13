import { useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { storage } from "../data/storage";
import { useAuth } from "../context/useAuth";
import { formatDate } from "../lib/format";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();

  // ── Name section ──────────────────────────────────────────────────────────
  const [nameValue, setNameValue] = useState(user?.name ?? "");
  const [savedName, setSavedName] = useState(user?.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState(null);

  // ── Password section ──────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErrors, setPwErrors] = useState({
    current: null,
    new: null,
    confirm: null,
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwGenericError, setPwGenericError] = useState(null);

  // ── Photo section ─────────────────────────────────────────────────────────
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ── Name save ─────────────────────────────────────────────────────────────
  async function handleNameSave() {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError("Name is required.");
      return;
    }
    if (trimmed.length > 50) {
      setNameError("Name must be 50 characters or fewer.");
      return;
    }
    setNameError(null);
    setNameLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        supabase.auth.updateUser({ data: { name: trimmed } }),
        supabase.from("users").update({ name: trimmed }).eq("id", user.id),
      ]);
      if (r1.error || r2.error) throw r1.error ?? r2.error;
      const cached = storage.getUserById(user.id);
      if (cached) cached.name = trimmed;
      setSavedName(trimmed);
      updateUser({ name: trimmed });
    } catch {
      setNameError("Could not save your name. Please try again.");
    } finally {
      setNameLoading(false);
    }
  }

  // ── Password change ───────────────────────────────────────────────────────
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    const errors = { current: null, new: null, confirm: null };

    if (!currentPw) errors.current = "Enter your current password.";

    if (!newPw) {
      errors.new = "Enter a new password.";
    } else if (newPw.length < 8) {
      errors.new = "Password must be at least 8 characters.";
    } else if (newPw === currentPw) {
      errors.new = "New password must differ from your current one.";
    }

    if (!confirmPw) {
      errors.confirm = "Please confirm your new password.";
    } else if (newPw && confirmPw !== newPw) {
      errors.confirm = "Passwords do not match.";
    }

    setPwErrors(errors);
    if (errors.current || errors.new || errors.confirm) return;

    setPwLoading(true);
    setPwGenericError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInError) {
        setPwErrors((prev) => ({
          ...prev,
          current: "Current password is incorrect.",
        }));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPw,
      });
      if (updateError) {
        setPwGenericError("Something went wrong. Please try again.");
        return;
      }

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwErrors({ current: null, new: null, confirm: null });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 5000);
    } catch {
      setPwGenericError("Something went wrong. Please try again.");
    } finally {
      setPwLoading(false);
    }
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPhotoError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setPhotoError("Please select a JPEG, PNG, WebP, or GIF image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setPhotoError("Image must be smaller than 5 MB.");
        return;
      }

      const objUrl = URL.createObjectURL(file);
      setPreviewUrl(objUrl);
      setPhotoLoading(true);

      try {
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(user.id, file, { upsert: true, contentType: file.type });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(user.id);
        const avatarUrl = data.publicUrl;

        const { error: dbError } = await supabase
          .from("users")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id);
        if (dbError) throw dbError;

        const cached = storage.getUserById(user.id);
        if (cached) cached.avatar_url = avatarUrl;
        updateUser({ avatarUrl });
      } catch {
        setPhotoError("Could not upload photo. Please try again.");
        setPreviewUrl(null);
      } finally {
        URL.revokeObjectURL(objUrl);
        setPhotoLoading(false);
      }
    },
    [user, updateUser],
  );

  const nameUnchanged = nameValue.trim() === savedName;
  const currentAvatarSrc = previewUrl ?? user?.avatarUrl ?? null;

  return (
    <div className="min-h-screen bg-canvas">
      <title>Profile | Splitmate</title>
      <AppHeader />
      <main className="page py-8">
        <h1 className="mb-6 text-2xl font-bold text-ink">Profile</h1>

        {/* Identity card */}
        <div className="card mb-4">
          <h2 className="mb-4 text-base font-semibold text-ink">Identity</h2>

          {/* Avatar + change photo */}
          <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <div className="relative shrink-0">
              {currentAvatarSrc ? (
                <img
                  src={currentAvatarSrc}
                  alt={user?.name ?? "Avatar"}
                  className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
                />
              ) : (
                <Avatar name={user?.name} size={96} />
              )}
              {photoLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 sm:items-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={photoLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                Change photo
              </button>
              {photoError && (
                <p className="text-sm text-red-600">{photoError}</p>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="field-label" htmlFor="profile-name">
              Name
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="profile-name"
                type="text"
                className="field sm:flex-1"
                value={nameValue}
                onChange={(e) => {
                  setNameValue(e.target.value);
                  setNameError(null);
                }}
              />
              <button
                type="button"
                className="btn-primary w-full sm:w-auto sm:shrink-0"
                disabled={nameUnchanged || nameLoading}
                onClick={handleNameSave}
              >
                {nameLoading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Spinner />
                    Saving…
                  </span>
                ) : nameUnchanged ? (
                  "Saved"
                ) : (
                  "Save"
                )}
              </button>
            </div>
            {nameError && (
              <p className="mt-1 text-sm text-red-600">{nameError}</p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="field-label" htmlFor="profile-email">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              readOnly
              className="field cursor-not-allowed bg-canvas text-ink-soft"
              value={user?.email ?? ""}
            />
            <p className="mt-1 text-sm text-ink-muted">
              Email cannot be changed.
            </p>
          </div>

          {/* Member since */}
          <div>
            <p className="field-label">Member since</p>
            <p className="text-sm text-ink">{formatDate(user?.createdAt)}</p>
          </div>
        </div>

        {/* Change Password card */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-ink">
            Change Password
          </h2>

          {pwSuccess && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Password updated successfully.
            </div>
          )}
          {pwGenericError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {pwGenericError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="mb-4">
              <label className="field-label" htmlFor="current-pw">
                Current password
              </label>
              <input
                id="current-pw"
                type="password"
                className="field"
                value={currentPw}
                onChange={(e) => {
                  setCurrentPw(e.target.value);
                  setPwErrors((prev) => ({ ...prev, current: null }));
                  if (pwSuccess) setPwSuccess(false);
                  if (pwGenericError) setPwGenericError(null);
                }}
              />
              {pwErrors.current && (
                <p className="mt-1 text-sm text-red-600">{pwErrors.current}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="field-label" htmlFor="new-pw">
                New password
              </label>
              <input
                id="new-pw"
                type="password"
                className="field"
                value={newPw}
                onChange={(e) => {
                  setNewPw(e.target.value);
                  setPwErrors((prev) => ({ ...prev, new: null }));
                  if (pwSuccess) setPwSuccess(false);
                  if (pwGenericError) setPwGenericError(null);
                }}
              />
              {pwErrors.new && (
                <p className="mt-1 text-sm text-red-600">{pwErrors.new}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="field-label" htmlFor="confirm-pw">
                Confirm new password
              </label>
              <input
                id="confirm-pw"
                type="password"
                className="field"
                value={confirmPw}
                onChange={(e) => {
                  setConfirmPw(e.target.value);
                  setPwErrors((prev) => ({ ...prev, confirm: null }));
                  if (pwSuccess) setPwSuccess(false);
                  if (pwGenericError) setPwGenericError(null);
                }}
              />
              {pwErrors.confirm && (
                <p className="mt-1 text-sm text-red-600">{pwErrors.confirm}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={pwLoading}
            >
              {pwLoading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Spinner />
                  Updating…
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
