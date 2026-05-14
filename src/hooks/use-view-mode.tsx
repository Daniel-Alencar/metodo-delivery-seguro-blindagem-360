import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

export type ViewMode = "admin" | "mentor";

const KEY = "viewAs";

function read(): ViewMode | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(KEY);
  return v === "admin" || v === "mentor" ? v : null;
}

export function setViewMode(v: ViewMode) {
  sessionStorage.setItem(KEY, v);
  window.dispatchEvent(new Event("viewmode-change"));
}

export function clearViewMode() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("viewmode-change"));
}

/**
 * Resolves the current "view as" mode for super admins (who have admin AND mentor roles).
 * - Pure mentor (no admin): always "mentor".
 * - Pure admin (no mentor): always "admin".
 * - Both: whatever they picked in /escolher-perfil; null until chosen.
 * - Neither: null.
 */
export function useViewMode() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isMentor = roles.includes("mentor");
  const [stored, setStored] = useState<ViewMode | null>(read);

  useEffect(() => {
    const onChange = () => setStored(read());
    window.addEventListener("viewmode-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("viewmode-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const needsChoice = isAdmin && isMentor && !stored;
  const mode: ViewMode | null = isAdmin && isMentor
    ? stored
    : isAdmin
      ? "admin"
      : isMentor
        ? "mentor"
        : null;

  return {
    mode,
    needsChoice,
    canSwitch: isAdmin && isMentor,
    isAdminView: mode === "admin",
    isMentorView: mode === "mentor",
  };
}
