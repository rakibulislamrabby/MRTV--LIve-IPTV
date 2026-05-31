import type { LucideIcon } from "lucide-react";

interface AppIconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

export function AppIcon({ icon: Icon, className, size = 18 }: AppIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={2}
      className={className ? `lucide-icon ${className}` : "lucide-icon"}
      aria-hidden
    />
  );
}
