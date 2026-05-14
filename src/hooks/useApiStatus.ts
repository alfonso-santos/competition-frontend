import { useEffect, useState } from "react";
import { publicFetch } from "../lib/api";
import type { ApiStatus } from "../lib/types";

export function useApiStatus() {
  const [remoteStatus, setRemoteStatus] = useState<"checking" | "ok" | "down">("checking");
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

  useEffect(() => {
    if (!baseUrl) return;

    let cancelled = false;
    publicFetch("/health")
      .then(() => {
        if (!cancelled) setRemoteStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setRemoteStatus("down");
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const apiStatus: ApiStatus = baseUrl ? remoteStatus : "missing_base_url";
  return { apiStatus, baseUrl };
}
