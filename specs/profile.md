# Profile Page Spec

**Route:** `/profile` (protected — redirects to `/login` if unauthenticated)  
**Component:** `src/pages/Profile.jsx`

---

## 1. What the Page Shows

The Profile page is a single-column settings form. It contains three sections stacked vertically:

| Section         | Fields                                                |
| --------------- | ----------------------------------------------------- |
| Identity        | Profile photo, display name, email address, join date |
| Change Password | Current password, new password, confirm new password  |

All sections are always visible. There is no tab or accordion UI — everything is on one scrollable page.

### 1.1 Identity Section Fields

**Profile photo**

- Circular avatar, 96×96 px on desktop, 80×80 px on mobile.
- If the user has no uploaded photo, show the existing `<Avatar>` component (initials generated from `user.name`), scaled to the same size.
- If a photo exists, render it as a circular `<img>` with `object-fit: cover`.
- Below the avatar, a "Change photo" button (secondary style) opens the file picker. On mobile this sits below the avatar centered; on desktop it sits to the right of the avatar inline.

**Display name**

- Labelled "Name".
- Editable `<input type="text">`.
- Pre-filled with `user.name` from `AuthContext`.
- Has a Save button that is disabled while the value is unchanged from the last saved value.

**Email address**

- Labelled "Email".
- `<input type="email" readOnly>` — visually styled to look non-interactive (use `bg-gray-50 cursor-not-allowed text-gray-500` or the equivalent design token).
- A small note below the field: "Email cannot be changed."
- No Save button for this field.

**Member since**

- Labelled "Member since".
- Read-only, non-interactive text (not an input — render as a `<p>` or `<span>`).
- Value: the account creation date formatted with `formatDate()` from `src/lib/format.js`.
- Source: `session.user.created_at` from the Supabase auth session. Add `createdAt` to the `user` object constructed in `AuthContext.jsx` (line ~8):
  ```js
  createdAt: session.user.created_at,  // ISO string from Supabase
  ```

---

## 2. Editing the Display Name

### Flow

1. User edits the Name input.
2. While the value differs from the last saved name, the Save button becomes active. While it matches, the button is disabled and labelled "Saved".
3. User clicks Save.
4. Button enters loading state: disabled, shows a spinner, labelled "Saving…".
5. On success: button returns to disabled "Saved" state. The `AuthContext` user object is updated in-place so the navbar reflects the new name immediately (see §5).
6. On error: button returns to active "Save" state and an inline error message appears below the input.

### Persistence

Two writes must happen, both awaited together with `Promise.all`:

```js
await Promise.all([
  supabase.auth.updateUser({ data: { name: trimmedName } }),
  supabase.from("users").update({ name: trimmedName }).eq("id", user.id),
]);
```

The `users` table write keeps the cache in sync with what `storage.getUsers()` returns; the auth metadata write keeps the session's `user_metadata.name` consistent so it survives a page refresh.

After a successful save, call `storage._users` cache update:

```js
const cached = storage.getUserById(user.id);
if (cached) cached.name = trimmedName;
```

### Validation (client-side, checked on Save click before the network call)

| Rule                      | Error message                          |
| ------------------------- | -------------------------------------- |
| Empty or whitespace-only  | "Name is required."                    |
| Longer than 50 characters | "Name must be 50 characters or fewer." |

Trim the value before validation and before persisting.

---

## 3. Changing the Password

### Fields

- **Current password** — `<input type="password">`, labelled "Current password".
- **New password** — `<input type="password">`, labelled "New password".
- **Confirm new password** — `<input type="password">`, labelled "Confirm new password".
- A single **"Update password"** button (primary style) below the three fields.

### Validation Rules (checked on submit, before any network call)

| Rule                                                 | Field                | Error message                                     |
| ---------------------------------------------------- | -------------------- | ------------------------------------------------- |
| Current password empty                               | Current password     | "Enter your current password."                    |
| New password empty                                   | New password         | "Enter a new password."                           |
| New password shorter than 8 characters               | New password         | "Password must be at least 8 characters."         |
| New password same as current (client-side heuristic) | New password         | "New password must differ from your current one." |
| Confirm field empty                                  | Confirm new password | "Please confirm your new password."               |
| Confirm field doesn't match new password             | Confirm new password | "Passwords do not match."                         |

Show each error inline below its own field. All errors are evaluated together on submit — do not validate on blur.

### Network Flow

1. Validate (above). If any error, abort.
2. Re-authenticate to verify the current password:
   ```js
   const { error: signInError } = await supabase.auth.signInWithPassword({
     email: user.email,
     password: currentPassword,
   });
   ```
   If `signInError`, show "Current password is incorrect." below the Current password field and abort.
3. Update the password:
   ```js
   const { error: updateError } = await supabase.auth.updateUser({
     password: newPassword,
   });
   ```
   If `updateError`, show a generic error (see §6) and abort.
4. On success: clear all three fields and show an inline success banner: "Password updated successfully."

The button shows a loading spinner and is disabled for the duration of the network calls.

---

## 4. Profile Photo Upload

### Trigger

Clicking "Change photo" opens the native OS file picker via a hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif">`. The visible button is a `<label>` wrapping or programmatically triggering the hidden input.

### Accepted file types

`image/jpeg`, `image/png`, `image/webp`, `image/gif`  
Max file size: **5 MB**.

### Client-side checks (before upload)

| Condition                      | Error message                                    |
| ------------------------------ | ------------------------------------------------ |
| File type not in accepted list | "Please select a JPEG, PNG, WebP, or GIF image." |
| File larger than 5 MB          | "Image must be smaller than 5 MB."               |

Show the error as a small red text below the avatar area. It disappears when the user selects a new file.

### Upload and storage

Photos are stored in the Supabase Storage bucket **`avatars`** (public bucket, created separately in the Supabase dashboard).

Path: `avatars/{userId}` (no extension — always overwrite the same key so old photos don't accumulate).

Upload call:

```js
const { error } = await supabase.storage
  .from("avatars")
  .upload(user.id, file, { upsert: true, contentType: file.type });
```

After a successful upload, get the public URL:

```js
const { data } = supabase.storage.from("avatars").getPublicUrl(user.id);
const avatarUrl = data.publicUrl;
```

Persist the URL to the `users` table:

```js
await supabase
  .from("users")
  .update({ avatar_url: avatarUrl })
  .eq("id", user.id);
```

Update the AuthContext `user` object with `avatarUrl` (see §5).

### Optimistic preview

As soon as the user selects a file (before upload), show a local object URL preview using `URL.createObjectURL(file)`. This makes the UI feel instant. Revoke the object URL after upload completes (`URL.revokeObjectURL`).

### Fallback

If `user.avatarUrl` is null/undefined, render the `<Avatar>` initials component. The `<Avatar>` component already exists at `src/components/Avatar.jsx` and accepts a `name` prop and a `size` prop (add the `size` prop if not already present — it should set `width` and `height` in px).

### Database migration required

Add `avatar_url` column to the `users` table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
```

Apply via `mcp__supabase__apply_migration` or the Supabase dashboard.

Also load `avatar_url` during `storage.init()`: when the `users` rows are fetched, include `avatar_url` in the select and map it to `avatarUrl` in the in-memory user object shape.

---

## 5. Keeping the Navbar in Sync

`AppHeader.jsx` reads `user.name` from `useAuth()`. Because `user` is state in `AuthContext`, updating it causes a re-render of all consumers including the header — no extra wiring needed.

### Required changes to `AuthContext.jsx`

1. Expand the `user` object shape:

   ```js
   {
     id: session.user.id,
     name: session.user.user_metadata?.name ?? session.user.email,
     email: session.user.email,
     createdAt: session.user.created_at,
     avatarUrl: /* fetched from users table during init */ null,
   }
   ```

2. Expose an `updateUser(patch)` method in the context value that merges a partial object into the `user` state:

   ```js
   const updateUser = useCallback((patch) => {
     setUser((prev) => ({ ...prev, ...patch }));
   }, []);
   ```

   Export it from the context value object alongside `login`, `logout`, etc.

3. Load `avatarUrl` during auth init: after `storage.init(userId)`, fetch the `avatar_url` from the `users` table once and set it on the user state:
   ```js
   const { data } = await supabase
     .from("users")
     .select("avatar_url")
     .eq("id", userId)
     .single();
   setUser((prev) => ({ ...prev, avatarUrl: data?.avatar_url ?? null }));
   ```

### `Profile.jsx` usage

After a successful name save:

```js
updateUser({ name: trimmedName });
```

After a successful photo upload:

```js
updateUser({ avatarUrl });
```

### `AppHeader.jsx` usage

If `user.avatarUrl` is set, render a small circular `<img>` (32×32 px) in place of the initials `<Avatar>`. If not set, keep the existing `<Avatar>` component. No other changes to the header are required.

---

## 6. Error States

### Inline field errors

Each field that can have an error renders a `<p>` immediately below itself with class `text-sm text-red-600 mt-1`. The message is cleared when the field value changes.

### Section-level success banner

On successful password update, show a dismissible green banner at the top of the Change Password section:

```html
<div
  class="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800"
>
  Password updated successfully.
</div>
```

The banner is dismissed automatically after 5 seconds or when the user edits any password field.

### Generic/unexpected errors

If a Supabase call returns an error that isn't covered by the specific cases above, show a section-level red banner:

```html
<div
  class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
>
  Something went wrong. Please try again.
</div>
```

### Summary of all error messages

| Trigger                         | Location                     | Message                                           |
| ------------------------------- | ---------------------------- | ------------------------------------------------- |
| Name is empty                   | Below Name field             | "Name is required."                               |
| Name > 50 chars                 | Below Name field             | "Name must be 50 characters or fewer."            |
| Name save fails (network)       | Below Name field             | "Could not save your name. Please try again."     |
| Current password empty          | Below Current password field | "Enter your current password."                    |
| New password empty              | Below New password field     | "Enter a new password."                           |
| New password < 8 chars          | Below New password field     | "Password must be at least 8 characters."         |
| New password == current         | Below New password field     | "New password must differ from your current one." |
| Confirm field empty             | Below Confirm field          | "Please confirm your new password."               |
| Confirm doesn't match           | Below Confirm field          | "Passwords do not match."                         |
| Current password wrong          | Below Current password field | "Current password is incorrect."                  |
| Password update fails (network) | Section-level red banner     | "Something went wrong. Please try again."         |
| Invalid file type               | Below avatar area            | "Please select a JPEG, PNG, WebP, or GIF image."  |
| File > 5 MB                     | Below avatar area            | "Image must be smaller than 5 MB."                |
| Photo upload fails (network)    | Below avatar area            | "Could not upload photo. Please try again."       |

---

## 7. Layout — Mobile vs Desktop

The page uses the existing `.page` semantic class for the outer wrapper and `.card` for each section.

### Desktop (≥ 768 px)

```
┌─────────────────────────────────────┐
│  AppHeader                          │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Profile                            │ ← page heading (h1, text-2xl font-bold)
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Identity                       │ │  ← .card
│ │                                 │ │
│ │  [Avatar 96px]  Change photo >  │ │  ← avatar + button in a flex row
│ │                                 │ │
│ │  Name         [____________] [Save] │
│ │  Email        [____________] (read-only note) │
│ │  Member since  May 13, 2025     │ │  ← plain text
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Change Password                │ │  ← .card
│ │                                 │ │
│ │  Current password [__________]  │ │
│ │  New password     [__________]  │ │
│ │  Confirm password [__________]  │ │
│ │                [Update password]│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- The page content is constrained to `max-w-2xl mx-auto` — same content-width convention used on `GroupSettings`.
- Within the Identity card, the avatar and "Change photo" button are displayed in a `flex items-center gap-6` row. The form fields below are full-width.
- The Name field and its Save button are in a `flex gap-2` row: the input takes `flex-1`, the Save button is fixed-width.

### Mobile (< 768 px)

- Avatar is centered above the "Change photo" button (flex column, items-center).
- Name field and Save button stack: input is full-width, Save button is full-width below it (or right-aligned using `flex justify-end`).
- All card padding reduces from `p-6` to `p-4`.
- All three password fields are full-width stacked with 4px vertical gap.
- "Update password" button is full-width on mobile.

### Navigation

The Profile page is reachable by clicking the user's name or avatar in `AppHeader`. On desktop this is a text link; on mobile it can be tucked into a dropdown or remain a visible link — implementation detail left to the builder. At minimum, add `<Link to="/profile">` around the user name display in `AppHeader.jsx`.

---

## 8. Files to Create / Modify

| Action        | File                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Create        | `src/pages/Profile.jsx`                                                                               |
| Modify        | `src/App.jsx` — add `/profile` route inside `<ProtectedRoute>`                                        |
| Modify        | `src/context/AuthContext.jsx` — add `createdAt`, `avatarUrl`, `updateUser`                            |
| Modify        | `src/components/AppHeader.jsx` — link user name to `/profile`; show avatar if `user.avatarUrl` is set |
| Modify        | `src/data/storage.js` — include `avatar_url` in user fetch during `init()`                            |
| Migrate       | `users` table — add `avatar_url text` column                                                          |
| Create bucket | Supabase Storage — `avatars` bucket, public read                                                      |

---

## 9. RLS / Storage Policies

### `users` table

The existing RLS policy for `users` must allow a user to `UPDATE` their own row. Add if missing:

```sql
CREATE POLICY "users can update own row"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### `avatars` storage bucket

```sql
-- Anyone authenticated can upload to their own path
CREATE POLICY "authenticated upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text);

-- Anyone authenticated can update their own avatar
CREATE POLICY "authenticated update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND name = auth.uid()::text);

-- Public read (bucket is public)
CREATE POLICY "public read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```
