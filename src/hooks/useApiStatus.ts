import { useEffect, useState } from "react";
import { publicFetch } from "../lib/api";
import type { ApiStatus } from "../lib/types";

export function useApiStatus() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

  useEffect(() => {
    if (!baseUrl) {
      setApiStatus("missing_base_url");
      return;
    }
    setApiStatus("checking");
    publicFetch("/health")
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("down"));
  }, [baseUrl]);

  return { apiStatus, baseUrl };
}
