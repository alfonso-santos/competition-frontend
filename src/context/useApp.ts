import { useContext } from "react";
import { AppContext } from "./AppContext.shared";
import type { AppContextValue } from "./AppContext";

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider />");
  return ctx;
}
