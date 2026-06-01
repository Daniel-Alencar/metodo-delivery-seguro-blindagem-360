import { useEffect, useState } from "react";

export type Vertical = "food-service" | "pet-shop";

export const VERTICAL_META: Record<Vertical, {
  label: string;
  short: string;
  method: string;
  // Tailwind utility tokens for accent badges/rows
  badgeClass: string;
  rowClass: string;
  ringClass: string;
  dotClass: string;
}> = {
  "food-service": {
    label: "Método Blindagem360 - MB360º",
    short: "MB360º",
    method: "Método Blindagem360 - MB360º",
    badgeClass: "border-blue-500/40 bg-blue-500/15 text-blue-200",
    rowClass: "bg-blue-500/5 hover:bg-blue-500/10",
    ringClass: "ring-blue-500/40",
    dotClass: "bg-blue-400",
  },
  "pet-shop": {
    label: "Método Pet Shop Seguro — MPS",
    short: "Pet Shop · MPS",
    method: "Método Pet Shop Seguro — MPS",
    badgeClass: "border-sky-300/50 bg-sky-300/15 text-sky-100",
    rowClass: "bg-sky-300/5 hover:bg-sky-300/10",
    ringClass: "ring-sky-300/50",
    dotClass: "bg-sky-300",
  },
};

const KEY = "activeVertical";

function read(): Vertical | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(KEY);
  return v === "food-service" || v === "pet-shop" ? v : null;
}

export function setActiveVertical(v: Vertical) {
  sessionStorage.setItem(KEY, v);
  window.dispatchEvent(new Event("activevertical-change"));
}

export function clearActiveVertical() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("activevertical-change"));
}

export function useActiveVertical() {
  const [vertical, setVertical] = useState<Vertical | null>(read);
  useEffect(() => {
    const onChange = () => setVertical(read());
    window.addEventListener("activevertical-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("activevertical-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return {
    vertical,
    meta: vertical ? VERTICAL_META[vertical] : null,
    needsChoice: vertical === null,
  };
}
