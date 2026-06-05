interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={`brand-logo ${compact ? "brand-logo-compact" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon.svg"
        alt=""
        className="brand-logo-mark"
        width={compact ? 28 : 32}
        height={compact ? 28 : 32}
        decoding="async"
      />
      <h1 className="brand-logo-text">
        <span className="brand-logo-dofadar">Dofadar</span>
        <span className="brand-logo-tv">Tv</span>
      </h1>
    </div>
  );
}
