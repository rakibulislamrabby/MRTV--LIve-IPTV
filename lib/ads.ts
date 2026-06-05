declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, unknown>;
    };
  }
}

export type AdScriptRole = "popunder" | "banner";

/** Origins to prefetch — update when ad zone domains change. */
export const AD_NETWORK_ORIGINS = [
  "https://www.effectivecpmnetwork.com",
  "https://pl29640358.effectivecpmnetwork.com",
  "https://www.highperformanceformat.com",
] as const;

export interface BannerAdConfig {
  key: string;
  script: string;
  height: number;
  width: number;
}

export const DESKTOP_BANNER_AD: BannerAdConfig = {
  key: "63b55d97f8f56f45eff6eb11de497487",
  script:
    "https://www.highperformanceformat.com/63b55d97f8f56f45eff6eb11de497487/invoke.js",
  height: 90,
  width: 728,
};

/** 320×50 — mobile home page footer only. */
export const MOBILE_FOOTER_BANNER_AD: BannerAdConfig = {
  key: "1ff89aa7b36cd6023124e5a7bf45a9ef",
  script:
    "https://www.highperformanceformat.com/1ff89aa7b36cd6023124e5a7bf45a9ef/invoke.js",
  height: 50,
  width: 320,
};

export const MOBILE_BANNER_QUERY = "(max-width: 1024px)";

export const POPUNDER_AD_SCRIPT =
  "https://pl29640358.effectivecpmnetwork.com/e8/b8/ec/e8b8ec8e360a2d4306a5f126780965fa.js";

export const SMART_LINK_URL =
  "https://www.effectivecpmnetwork.com/p3w1d8tf?key=f870477008fe14aeba582f0eb3eb4858";

const SESSION_KEYS = {
  popunder: "mrtv-popunder-loaded",
  smartLink: "mrtv-smart-link-opened",
} as const;

export function getBannerAdForPlacement(
  placement: "header" | "footer",
  isMobile: boolean,
): BannerAdConfig | null {
  if (placement === "header" && !isMobile) {
    return DESKTOP_BANNER_AD;
  }
  if (placement === "footer" && isMobile) {
    return MOBILE_FOOTER_BANNER_AD;
  }
  return null;
}

function hasLoadedAdScript(role: AdScriptRole): boolean {
  return Boolean(document.querySelector(`script[data-ad-role="${role}"]`));
}

function appendAdScript(
  src: string,
  role: AdScriptRole,
  extraDataset: Record<string, string> = {},
): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.referrerPolicy = "strict-origin-when-cross-origin";
  script.dataset.adRole = role;

  for (const [key, value] of Object.entries(extraDataset)) {
    script.dataset[key] = value;
  }

  document.body.appendChild(script);
  return script;
}

export function triggerPopunderAd(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(SESSION_KEYS.popunder)) return;
  if (hasLoadedAdScript("popunder")) return;

  sessionStorage.setItem(SESSION_KEYS.popunder, "1");
  appendAdScript(POPUNDER_AD_SCRIPT, "popunder");
}

export function triggerSmartLink(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(SESSION_KEYS.smartLink)) return;

  sessionStorage.setItem(SESSION_KEYS.smartLink, "1");
  window.open(SMART_LINK_URL, "_blank", "noopener,noreferrer");
}

export function loadBannerAd(slot: HTMLDivElement, config: BannerAdConfig): void {
  slot.replaceChildren();
  slot.dataset.bannerKey = config.key;

  window.atOptions = {
    key: config.key,
    format: "iframe",
    height: config.height,
    width: config.width,
    params: {},
  };

  const script = appendAdScript(config.script, "banner", { bannerKey: config.key });
  slot.appendChild(script);
}

export function isChannelButtonClickTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".channel-item"));
}

/** UI buttons except channel cards (those use the smart link). */
export function isButtonClickTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("button")) &&
    !isChannelButtonClickTarget(target)
  );
}
