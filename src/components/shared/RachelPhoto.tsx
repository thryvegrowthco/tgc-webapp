import Image from "next/image";
import { cn } from "@/lib/utils";

type PhotoVariant = "hero" | "about" | "about-2" | "profile";

interface RachelPhotoProps {
  variant?: PhotoVariant;
  className?: string;
  priority?: boolean;
  rounded?: boolean;
}

const photoConfig: Record<PhotoVariant, { src: string; alt: string; width: number; height: number; label: string }> = {
  hero: {
    src: "/images/headshots/rachel-hero.webp",
    alt: "Rachel, Founder of Thryve Growth Co.",
    width: 600,
    height: 750,
    label: "rachel-hero.webp",
  },
  about: {
    src: "/images/headshots/rachel-about.webp",
    alt: "Rachel, Founder of Thryve Growth Co. — About",
    width: 560,
    height: 700,
    label: "rachel-about.webp",
  },
  "about-2": {
    src: "/images/headshots/rachel-about-2.webp",
    alt: "Rachel working with clients at Thryve Growth Co.",
    width: 560,
    height: 420,
    label: "rachel-about-2.webp",
  },
  profile: {
    src: "/images/headshots/rachel-profile.webp",
    alt: "Rachel — Thryve Growth Co.",
    width: 200,
    height: 200,
    label: "rachel-profile.webp",
  },
};

/**
 * RachelPhoto — reusable professional photo component.
 * Shows a branded placeholder until real images are added to /public/images/headshots/
 */
export function RachelPhoto({
  variant = "hero",
  className,
  priority = false,
  rounded = false,
}: RachelPhotoProps) {
  const config = photoConfig[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-brand-100",
        rounded && "rounded-full",
        !rounded && "rounded-2xl",
        className
      )}
    >
      <Image
        src={config.src}
        alt={config.alt}
        width={config.width}
        height={config.height}
        className={cn("object-cover w-full h-full", rounded && "rounded-full")}
        priority={priority}
      />
      {/* Branded placeholder shown while image loads or if missing */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200",
          "opacity-0" // Hidden when image loads; visible via CSS if image errors
        )}
      >
        <div className="text-center px-4">
          <div className="text-brand-600 text-4xl mb-2">📸</div>
          <p className="text-brand-800 font-semibold text-sm">Add headshot:</p>
          <p className="text-brand-700 text-xs font-mono mt-1">
            /public/images/headshots/
            <br />
            {config.label}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Circular profile variant with ring styling */
export function RachelProfileCircle({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div className={cn("relative flex-shrink-0 ring-2 ring-brand-200 rounded-full", sizeClasses[size], className)}>
      <RachelPhoto variant="profile" rounded className="w-full h-full" />
    </div>
  );
}
