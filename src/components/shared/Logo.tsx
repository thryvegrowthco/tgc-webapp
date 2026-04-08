import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
  linkClassName?: string;
}

export function Logo({ variant = "light", className, linkClassName }: LogoProps) {
  const logoSrc = variant === "dark" ? "/logos/logo-dark.svg" : "/logos/logo.svg";

  return (
    <Link href="/" className={cn("flex items-center gap-2 flex-shrink-0", linkClassName)}>
      {/* Logo image — falls back to text wordmark if SVG not yet added */}
      <div className={cn("relative", className)}>
        <Image
          src={logoSrc}
          alt="Thryve Growth Co."
          width={160}
          height={44}
          className="h-11 w-auto object-contain"
          priority
          onError={() => {}}
        />
      </div>
      {/* Text fallback — shown only when logo image is missing */}
      <noscript>
        <span
          className={cn(
            "font-display font-bold text-xl tracking-tight",
            variant === "dark" ? "text-white" : "text-brand-900"
          )}
        >
          Thryve Growth Co.
        </span>
      </noscript>
    </Link>
  );
}

/** Text-only wordmark — used as fallback inside Logo when SVG missing */
export function LogoWordmark({ variant = "light", className }: { variant?: "light" | "dark"; className?: string }) {
  return (
    <Link href="/" className="flex items-center flex-shrink-0">
      <span
        className={cn(
          "font-display font-bold text-xl tracking-tight",
          variant === "dark" ? "text-white" : "text-brand-900",
          className
        )}
      >
        Thryve Growth Co.
      </span>
    </Link>
  );
}
