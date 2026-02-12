"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  redirectTo?: string;
};

export function ClientRouteGuard({ redirectTo = "/access-control/login" }: Props) {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function verify() {
      const response = await fetch("/api/auth/me", { method: "GET" });
      if (mounted && response.status === 401) {
        router.replace(redirectTo);
      }
    }
    void verify();
    return () => {
      mounted = false;
    };
  }, [redirectTo, router]);

  return null;
}

