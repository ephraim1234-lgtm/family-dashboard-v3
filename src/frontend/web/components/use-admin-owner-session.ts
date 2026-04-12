"use client";

import { useEffect, useState } from "react";

export type AdminOwnerSessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
};

const anonymousSession: AdminOwnerSessionState = {
  isAuthenticated: false,
  userId: null,
  activeHouseholdId: null,
  activeHouseholdRole: null
};

export function useAdminOwnerSession() {
  const [session, setSession] = useState<AdminOwnerSessionState>(anonymousSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store"
        });

        if (!response.ok) {
          if (isMounted) {
            setSession(anonymousSession);
            setIsLoading(false);
          }

          return;
        }

        const data = (await response.json()) as AdminOwnerSessionState;
        if (isMounted) {
          setSession(data);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setSession(anonymousSession);
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const isOwner =
    session.isAuthenticated
    && session.activeHouseholdId != null
    && session.activeHouseholdRole === "Owner";

  return {
    session,
    isLoading,
    isOwner
  };
}
