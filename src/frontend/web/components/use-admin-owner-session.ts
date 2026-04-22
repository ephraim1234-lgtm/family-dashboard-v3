"use client";

import { useEffect, useState } from "react";

export type AdminOwnerSessionState = {
  isAuthenticated: boolean;
  user: {
    userId: string;
    email: string;
    displayName: string;
  } | null;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
  hasActiveHousehold: boolean;
  needsOnboarding: boolean;
};

const anonymousSession: AdminOwnerSessionState = {
  isAuthenticated: false,
  user: null,
  activeHouseholdId: null,
  activeHouseholdRole: null,
  hasActiveHousehold: false,
  needsOnboarding: false
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
    && session.hasActiveHousehold
    && session.activeHouseholdRole === "Owner";

  return {
    session,
    isLoading,
    isOwner
  };
}
