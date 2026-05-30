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

export const MOBILE_BANNER_AD: BannerAdConfig = {
  key: "07f340849f54924dcea67814636701f5",
  script:
    "https://www.highperformanceformat.com/07f340849f54924dcea67814636701f5/invoke.js",
  height: 250,
  width: 300,
};

export const MOBILE_BANNER_QUERY = "(max-width: 1024px)";

export const POPUNDER_AD_SCRIPT =
  "https://pl29593548.effectivecpmnetwork.com/d8/ab/b5/d8abb563542bc3a0f03cf8f301a842f2.js";

export function getBannerAdForViewport(isMobile: boolean): BannerAdConfig {
  return isMobile ? MOBILE_BANNER_AD : DESKTOP_BANNER_AD;
}

export function triggerPopunderAd(): void {
  if (typeof window === "undefined") return;

  document
    .querySelectorAll("script[data-adsterra-popunder='true']")
    .forEach((node) => node.remove());

  const script = document.createElement("script");
  script.src = POPUNDER_AD_SCRIPT;
  script.async = true;
  script.dataset.adsterraPopunder = "true";
  document.body.appendChild(script);
}

export function isButtonClickTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button"));
}
