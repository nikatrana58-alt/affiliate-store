"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

export type UserRole = "GUEST" | "CUSTOMER" | "ADMIN";

type AuthContextType = {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "signin" | "signup" | "forgot";
  openAuthModal: (tab?: "signin" | "signup" | "forgot") => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: "GUEST",
  loading: true,
  isAuthModalOpen: false,
  authModalTab: "signin",
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("GUEST");
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup" | "forgot">("signin");

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      const auth = getFirebaseClientAuth();
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setRole("GUEST");
        } else {
          const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "nikatrana58@gmail.com").toLowerCase().trim();
          const userEmail = (currentUser.email || "").toLowerCase().trim();

          if (userEmail && (userEmail === adminEmail || currentUser.email?.endsWith("@ra2z.com"))) {
            setRole("ADMIN");
          } else {
            setRole("CUSTOMER");
          }
        }
        setLoading(false);
      });
    } catch (error) {
      console.warn("[auth-context] Firebase client auth not configured yet.", error);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const openAuthModal = (tab: "signin" | "signup" | "forgot" = "signin") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signOut = async () => {
    try {
      const auth = getFirebaseClientAuth();
      await firebaseSignOut(auth);
      // Clear admin session cookie if present
      await fetch("/api/admin/session", { method: "DELETE" }).catch(() => {});
    } catch (err) {
      console.error("[auth-context] Error signing out:", err);
    } finally {
      setUser(null);
      setRole("GUEST");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
