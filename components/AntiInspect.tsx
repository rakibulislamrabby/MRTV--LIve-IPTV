"use client";

import { useEffect } from "react";

const BLOCKED_KEYS = new Set([
  "F12",
  "I",
  "J",
  "C",
  "U",
  "S",
  "P",
]);

function isBlockedShortcut(event: KeyboardEvent): boolean {
  if (event.key === "F12") return true;

  const ctrlOrMeta = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;

  if (!ctrlOrMeta && !shift) return false;

  if (shift && ctrlOrMeta && BLOCKED_KEYS.has(event.key.toUpperCase())) {
    return true;
  }

  if (ctrlOrMeta && event.key.toUpperCase() === "U") return true;
  if (ctrlOrMeta && event.key.toUpperCase() === "S") return true;

  return false;
}

export function AntiInspect() {
  useEffect(() => {
    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const blockShortcuts = (event: KeyboardEvent) => {
      if (isBlockedShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const blockSelection = () => {
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
    };

    const detectDevTools = () => {
      const threshold = 140;
      const opened =
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold;

      if (opened) {
        document.documentElement.classList.add("devtools-open");
      } else {
        document.documentElement.classList.remove("devtools-open");
      }
    };

    blockSelection();
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockShortcuts, true);
    const interval = window.setInterval(detectDevTools, 1200);
    detectDevTools();

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockShortcuts, true);
      window.clearInterval(interval);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.documentElement.classList.remove("devtools-open");
    };
  }, []);

  return null;
}
