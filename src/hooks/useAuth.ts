import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

function firebaseErrorMessage(err: unknown): string {
  const anyErr = err as { code?: string; message?: string };
  const code = anyErr?.code ?? "";
  if (code === "auth/invalid-credential") return "Invalid email or password.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
  if (code === "auth/network-request-failed") return "Network error. Check your connection.";
  return anyErr?.message ? String(anyErr.message) : "Login failed.";
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function login(email: string, password: string) {
    setMessage("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setMessage("Welcome!");
    } catch (err) {
      setMessage(firebaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setMessage("");
    setBusy(true);
    try {
      await signOut(auth);
      setMessage("Logged out.");
    } catch {
      setMessage("Could not log out.");
    } finally {
      setBusy(false);
    }
  }

  return { user, busy, message, setMessage, login, logout };
}
