import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { storage } from "../data/storage";
import { AuthContext } from "./AuthContextValue";

function sessionToUser(session) {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.user_metadata?.name ?? session.user.email,
    email: session.user.email,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        // Restoring a persisted session on page load — init before showing UI.
        if (session) await storage.init(session.user.id);
        setUser(sessionToUser(session));
        setReady(true);
      } else if (event === "SIGNED_OUT") {
        storage.clear();
        setUser(null);
      }
      // SIGNED_IN is handled by login() / register() which await init themselves.
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, error: error.message };
    await storage.init(data.session.user.id);
    setUser(sessionToUser(data.session));
    return { ok: true };
  }

  async function register({ name, email, password }) {
    if (!name.trim()) return { ok: false, error: "Name is required." };
    if (!email.trim()) return { ok: false, error: "Email is required." };
    if (!password) return { ok: false, error: "Password is required." };

    const trimmedName = name.trim();
    const normalEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalEmail,
      password,
      options: { data: { name: trimmedName } },
    });
    if (error) return { ok: false, error: error.message };

    if (data.user) {
      // Best-effort insert — a DB trigger (handle_new_user) already created
      // the profile row at signup time, so this may get a 23505 (OK) or a
      // 401 if email confirmation is required (also OK; trigger handled it).
      await supabase
        .from("users")
        .insert({ id: data.user.id, name: trimmedName, email: normalEmail });

      if (data.session) {
        await storage._upgradePendingMembers({
          id: data.user.id,
          email: normalEmail,
          name: trimmedName,
        });
        await storage.init(data.user.id);
      }
    }

    if (data.session) setUser(sessionToUser(data.session));
    return { ok: true };
  }

  async function logout() {
    storage.clear();
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
