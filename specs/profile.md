# Profile Page Spec

**Route**: `/profile` (protected — redirect to `/` if not authenticated)  
**Page title**: `Profile — Splitmate`  
**Layout class**: `.page` (max-w-[680px], centered, px-4)

---

## 1. What Is Shown

The page has three distinct sections stacked vertically with `space-y-6` between them:

1. **Profile card** — avatar, display name, email, join date
2. **Edit name card** — inline form to rename the account
3. **Change password card** — current + new + confirm password

Each section is wrapped in a `.card` div.

---

## 2. Profile Card

```
┌─────────────────────────────────────────────┐
│  [Avatar 72px]  Name (h2)                   │
│                 email@example.com (read-only)│
│                 Joined May 2024 (read-only)  │
└─────────────────────────────────────────────┘
```

### Avatar

- **Size**: 72×72 px, `rounded-full`, `object-cover`
- **Fallback**: if no photo is uploaded, or if an uploaded photo URL fails to load (`onError`), render `<img src="/default-avatar.png" alt="Default avatar" className="w-full h-full rounded-full object-cover" />`. The asset is at `public/default-avatar.png`.
- The avatar is a clickable target that opens the photo upload flow (see §5). Show a small camera-icon overlay (`Camera` from lucide-react, 16px) on hover at bottom-right of the circle.

### Name

- `<h2 className="text-lg font-semibold text-ink">` — pulled from `user.name` (auth context)

### Email

- `<p className="text-sm text-ink-soft">` — pulled from `user.email`
- No edit control; no edit hint text. The email field is permanently read-only.

### Join date

- Label: `"Member since"`
- Value: formatted with `new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })` — e.g. `"May 2024"`
- Fetch `authUser.created_at` by calling `supabase.auth.getUser()` once on mount (store result in local state). While loading, show `"—"` in place of the date.
- `<p className="text-sm text-ink-muted">`

---

## 3. Edit Name Card

### Heading

`<h3 className="text-sm font-semibold text-ink mb-4">Display name</h3>`

### Form layout

A single labeled text input followed by a row of action buttons.

```
Display name *
┌─────────────────────────────────┐
│ Shubham Sarda                   │  ← .field
└─────────────────────────────────┘
[Save changes]  [Cancel]
```

- Input: `type="text"`, `className="field"`, `label="Display name"` (`.field-label`)
- Initialised with `user.name` on mount and whenever `user.name` changes externally.
- **Max length**: 60 characters (enforced via `maxLength` attribute and validated on submit).
- **Min length**: 1 non-whitespace character.

### Save logic

1. Trim the value. If it equals the current `user.name` exactly, do nothing and reset `dirty` state.
2. If blank after trim → show inline error (see §3.1).
3. If > 60 characters → show inline error.
4. Call `await updateName(trimmedValue)` (new method on `AuthProvider` — see §7.1).
5. While saving, disable both buttons and show `"Saving…"` in the Save button.
6. On success: show a transient success message below the buttons (`"Name updated"` in `text-sm text-pos`) that auto-clears after 3 seconds.
7. On error: show the API error string as an inline error (see §3.1).

### Cancel logic

Reset the input to `user.name` and clear any error/success state. Does not make any network calls.

### Dirty tracking

The Save button is `disabled` (`.btn-primary opacity-50 cursor-not-allowed`) when the trimmed input value equals the current `user.name`. The Cancel button is always enabled while the card is visible.

### 3.1 Inline errors

Shown as `<p className="text-sm text-neg mt-1.5">` immediately below the input, above the buttons.

| Condition        | Message                                |
| ---------------- | -------------------------------------- |
| Blank after trim | "Name cannot be empty."                |
| > 60 characters  | "Name must be 60 characters or fewer." |
| API failure      | Supabase error message verbatim        |

---

## 4. Change Password Card

### Heading

`<h3 className="text-sm font-semibold text-ink mb-4">Change password</h3>`

### Form layout

Three stacked labeled inputs, then a row of buttons.

```
Current password *
┌─────────────────────────────────┐
│ ••••••••                        │
└─────────────────────────────────┘
New password *
┌─────────────────────────────────┐
│ ••••••••                        │
└─────────────────────────────────┘
Confirm new password *
┌─────────────────────────────────┐
│ ••••••••                        │
└─────────────────────────────────┘
[Update password]  [Cancel]
```

All three inputs: `type="password"`, `.field` class.

### Validation rules (client-side, checked on submit before any network call)

| Rule                             | Error message                                          |
| -------------------------------- | ------------------------------------------------------ |
| Current password blank           | "Current password is required."                        |
| New password blank               | "New password is required."                            |
| New password < 8 characters      | "Password must be at least 8 characters."              |
| New password == current password | "New password must differ from your current password." |
| Confirm password blank           | "Please confirm your new password."                    |
| Confirm != new password          | "Passwords do not match."                              |

Errors display as `<p className="text-sm text-neg mt-1.5">` beneath the specific field that failed. Only the first failing field gets an error — validate top-to-bottom and stop at the first violation.

### Save logic

1. Run client-side validation (above).
2. Call `await updatePassword({ currentPassword, newPassword })` (new method — see §7.2).
3. While saving: disable all three inputs and both buttons; show `"Updating…"` in the submit button.
4. On success:
   - Clear all three fields.
   - Show a transient success banner inside the card: `"Password updated successfully"` in a `rounded-lg bg-pos-bg text-pos px-3 py-2 text-sm` block. Auto-clears after 4 seconds.
5. On error (wrong current password, or Supabase rate-limit/network): display the error message in a `rounded-lg bg-neg-bg text-neg px-3 py-2 text-sm` block above the buttons.

### Cancel logic

Clear all three fields and clear any error state.

---

## 5. Profile Photo Upload

### Entry point

Clicking the avatar in the Profile Card (§2) triggers the upload flow. There is no separate "Upload photo" button.

### Upload flow

1. A hidden `<input type="file" accept="image/jpeg,image/png,image/gif,image/webp">` is programmatically `.click()`-ed.
2. **Max file size**: 5 MB. If the selected file exceeds 5 MB, show a toast/inline error: `"Image must be under 5 MB."` Do not upload.
3. On valid selection: upload to Supabase Storage, then update the user record (see §7.3).
4. While uploading: show a spinner overlay on the avatar circle (semi-transparent white overlay, `animate-spin` circle icon). The user cannot re-click during upload.
5. On success: replace the avatar immediately (optimistic update via local `URL.createObjectURL` while the Supabase URL resolves; swap to the permanent URL once the upload completes).
6. On error: show `"Upload failed. Please try again."` as a toast beneath the avatar.

### Storage

- **Bucket**: `avatars` (must be created in Supabase with public read access)
- **File path**: `{userId}/avatar.{ext}` where `ext` is the lowercase extension of the original file
- **Overwrite**: always overwrite the existing file at that path (no versioning). Use `upsert: true` in the Supabase Storage upload call.
- **URL**: after upload, call `supabase.storage.from('avatars').getPublicUrl(filePath)` and store the returned `publicUrl` in:
  1. `supabase.auth.updateUser({ data: { avatar_url: publicUrl } })` — updates user metadata
  2. `supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId)` — updates the users table

### Remove photo

If the user already has a photo, show a small `"Remove photo"` text link (`btn-link` class) below the avatar in the Profile Card. Clicking it:

1. Calls `supabase.storage.from('avatars').remove([filePath])`
2. Calls `supabase.auth.updateUser({ data: { avatar_url: null } })`
3. Calls `supabase.from('users').update({ avatar_url: null }).eq('id', userId)`
4. Reverts the avatar to the initials fallback immediately (optimistic).

"Remove photo" is hidden when no photo is set.

### Fallback

If `avatar_url` is null/undefined, or if an `<img>` `onError` fires (broken URL), render `<img src="/default-avatar.png" />` as described in §2.

---

## 6. Navbar Update on Name Change

`AppHeader` currently renders `{user.name}` from the auth context (`useAuth().user.name`). Because `user` is React state inside `AuthProvider`, updating it via `setUser(...)` inside the new `updateName` method (§7.1) will cause `AppHeader` to re-render with the new name automatically — no additional wiring needed.

The name in the navbar updates the moment `updateName` resolves successfully (before the success message is shown to the user), not only after page reload.

---

## 7. New Auth Context Methods

The following three methods must be added to `AuthProvider` (`src/context/AuthContext.jsx`) and exposed through the context value.

### 7.1 `updateName(newName)`

```js
async function updateName(newName) {
  const trimmed = newName.trim();
  const { error } = await supabase.auth.updateUser({ data: { name: trimmed } });
  if (error) return { ok: false, error: error.message };

  // Mirror to users table
  await supabase.from("users").update({ name: trimmed }).eq("id", user.id);

  // Update in-memory cache
  const cached = storage.getUserById(user.id);
  if (cached) cached.name = trimmed;

  // Update React state so all consumers (including AppHeader) re-render
  setUser((prev) => ({ ...prev, name: trimmed }));
  return { ok: true };
}
```

### 7.2 `updatePassword({ currentPassword, newPassword })`

Supabase does not provide a "verify current password then change" API in a single call. Use reauthentication:

```js
async function updatePassword({ currentPassword, newPassword }) {
  // Reauthenticate to verify current password
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reAuthError)
    return { ok: false, error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

> Note: `signInWithPassword` is used here solely to verify the credential. It does not change the session — Supabase will re-issue the same session token. This is safe and is the recommended pattern when email confirmation is not required.

### 7.3 `updateAvatar(publicUrl)`

```js
async function updateAvatar(publicUrl) {
  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("users")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  const cached = storage.getUserById(user.id);
  if (cached) cached.avatar_url = publicUrl;

  setUser((prev) => ({ ...prev, avatar_url: publicUrl }));
  return { ok: true };
}
```

Expose all three in the context value object alongside `login`, `register`, `logout`.

---

## 8. Database Migration

Add the `avatar_url` column to the `users` table if it does not already exist:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
```

No RLS change is needed — the existing policy that allows users to update their own row covers this column.

---

## 9. Routing

In `App.jsx`, add:

```jsx
import Profile from "./pages/Profile";

// inside the router, alongside other protected routes:
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>;
```

Add a `"Profile"` link in `AppHeader` next to the Reports link:

```jsx
<Link
  to="/profile"
  className="text-sm text-ink-soft transition-colors hover:text-ink"
>
  Profile
</Link>
```

Place it between the Reports link and the user name span. The existing name span can remain as-is (it is not a link).

---

## 10. Layout — Desktop vs Mobile

### Desktop (≥ 640px)

- Single column, `.page` container (max-w-[680px], centered)
- Profile Card: avatar and text info side by side (`flex items-start gap-5`)
  - Avatar on the left (flex-shrink-0)
  - Name/email/join-date stacked on the right
- Edit Name Card and Change Password Card: full-width, stacked below
- Button rows: `flex gap-3 justify-end` (right-aligned)

### Mobile (< 640px)

- Same single column layout — no structural change needed
- Profile Card: avatar centered above text (`flex flex-col items-center text-center gap-3`)
- Apply this difference via `sm:` breakpoint prefix:
  ```
  flex-col items-center text-center sm:flex-row sm:items-start sm:text-left
  ```
- Button rows: `flex gap-3` (left-aligned, full width on very small screens if needed: `flex-col sm:flex-row`)
- All inputs remain full-width (`.field` is already `w-full`)
- Minimum touch target for avatar: 48×48 px (the avatar is 72px so this is satisfied)

---

## 11. Component File

Create `src/pages/Profile.jsx`. No sub-components need to be extracted unless the file exceeds ~250 lines — in that case, extract `ChangePasswordForm` as a local component within the same file (not a separate file).

Do not create a new CSS file. Use existing semantic classes from `src/index.css` throughout.

---

## 12. Error States Summary

| Section         | Error                              | Display location          | Style                                             |
| --------------- | ---------------------------------- | ------------------------- | ------------------------------------------------- |
| Edit name       | Blank / too long / API error       | Below input               | `text-sm text-neg mt-1.5`                         |
| Change password | Any validation failure             | Below the offending field | `text-sm text-neg mt-1.5`                         |
| Change password | Wrong current password / API error | Block above buttons       | `rounded-lg bg-neg-bg text-neg px-3 py-2 text-sm` |
| Photo upload    | File too large                     | Below avatar              | `text-sm text-neg`                                |
| Photo upload    | Network/API error                  | Below avatar              | `text-sm text-neg`                                |
| Join date fetch | Network failure                    | In place of date value    | Show `"—"` silently; no visible error             |

---

## 13. Loading States

| Action                                 | Loading indicator                                                          |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Initial page load (fetching join date) | `"—"` placeholder in join date field                                       |
| Saving name                            | Save button text changes to `"Saving…"`, both buttons disabled             |
| Updating password                      | Submit button text changes to `"Updating…"`, all inputs + buttons disabled |
| Photo upload                           | Spinner overlay on avatar circle                                           |
| Photo remove                           | Avatar fades to 50% opacity while in-flight                                |

---

## 14. Accessibility

- All form inputs have associated `<label>` elements (not just placeholder text).
- Error messages use `role="alert"` so screen readers announce them immediately.
- Success banners use `role="status"`.
- The avatar click target has `aria-label="Change profile photo"`.
- Password inputs have `autocomplete="current-password"` and `autocomplete="new-password"` respectively.
- Disabled buttons retain their visible disabled state — do not rely solely on `opacity` changes.
