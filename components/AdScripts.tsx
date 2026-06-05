"use client";

import { useEffect } from "react";

import { loadSocialBarAd } from "@/lib/ads";

/** Loads global ad scripts (social bar) once per session after idle. */
export function AdScripts() {
  useEffect(() => {
    return loadSocialBarAd();
  }, []);

  return null;
}
