"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getIdToken, observeAuth, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail } from "@/lib/firebase-client";

export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      try {
        const credential = await signInWithEmail(email, password);
        return { data: credential.user, error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : "Sign-in failed." } };
      }
    },
    social: async ({ provider }: { provider: "google"; callbackURL?: string }) => {
      try {
        const credential = provider === "google" ? await signInWithGoogle() : null;
        return { data: credential?.user ?? null, error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : "Google sign-in failed." } };
      }
    },
  },
  signUp: {
    email: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      try {
        const credential = await signUpWithEmail(name, email, password);
        return { data: credential.user, error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : "Account creation failed." } };
      }
    },
  },
  signOut,
  useSession: () => {
    const [user, setUser] = useState<User | null>(null);
    const [pending, setPending] = useState(true);

    useEffect(() => {
      return observeAuth((nextUser) => {
        setUser(nextUser);
        setPending(false);
      });
    }, []);

    return {
      data: user ? { user: { id: user.uid, name: user.displayName || "Learner", email: user.email || "" } } : null,
      isPending: pending,
    };
  },
};


export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, cache: init.cache ?? "no-store" });
}
