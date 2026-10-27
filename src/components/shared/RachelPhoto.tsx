import Image from "next/image";
import { cn } from "@/lib/utils";

type PhotoVariant = "hero" | "about" | "about-2" | "profile";

interface RachelPhotoProps {
  variant?: PhotoVariant;
  className?: string;
  priority?: boolean;
  rounded?: boolean;
  /** Responsive sizes hint for next/image. */
  sizes?: string;
}

const photoConfig: Record<PhotoVariant, { src: string; alt: string; width: number; height: number }> = {
  hero: {
    src: "/images/headshots/rachel-hero.webp",
    alt: "Rachel, Founder of Thryve Growth Co.",
    width: 600,
    height: 750,
  },
  about: {
    src: "/images/headshots/rachel-about.webp",
    alt: "Rachel, Founder of Thryve Growth Co.",
    width: 560,
    height: 700,
  },
  "about-2": {
    src: "/images/headshots/rachel-about-2.webp",
    alt: "Rachel working with clients at Thryve Growth Co.",
    width: 560,
    height: 420,
  },
  profile: {
    src: "/images/headshots/rachel-profile.webp",
    alt: "Rachel, Thryve Growth Co.",
    width: 200,
    height: 200,
  },
};

/**
 * RachelPhoto — reusable professional photo component.
 */
export function RachelPhoto({
  variant = "hero",
  className,
  priority = false,
  rounded = false,
  sizes = "(min-width: 1024px) 600px, 90vw",
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
        sizes={sizes}
        className={cn("object-cover w-full h-full", rounded && "rounded-full")}
        priority={priority}
      />
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
