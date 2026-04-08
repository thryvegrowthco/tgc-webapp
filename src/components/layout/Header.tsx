"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

const coreServices = [
  {
    title: "HR Consulting & Team Development",
    href: "/services/hr-consulting",
    description: "Strategic HR support for organizations that want clarity, structure, and stronger leadership.",
    badge: "For Businesses",
  },
  {
    title: "Career & Leadership Coaching",
    href: "/services/coaching",
    description: "Clarity, confidence, and accountability to help you move forward with intention.",
    badge: "For Individuals",
  },
  {
    title: "Culture & Engagement Consulting",
    href: "/services/culture-engagement",
    description: "Build a culture that is clear, aligned, and sustainable.",
    badge: "For Businesses",
  },
];

const addOnServices = [
  { title: "Interview Preparation", href: "/services/interview-prep" },
  { title: "Resume & Career Materials", href: "/services/resume-materials" },
  { title: "Job Alerts & Watchlists", href: "/services/job-alerts" },
];

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Investment", href: "/investment" },
  { label: "Blog", href: "/blog" },
];

export function Header() {
  const pathname = usePathname();
  const [servicesOpen, setServicesOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu open
  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">

            {/* Logo */}
            <Logo />

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">

              {/* Services dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  onKeyDown={(e) => e.key === "Escape" && setServicesOpen(false)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-md text-base font-medium transition-colors",
                    isActive("/services")
                      ? "text-brand-700 bg-brand-50"
                      : "text-neutral-600 hover:text-brand-700 hover:bg-brand-50"
                  )}
                  aria-expanded={servicesOpen}
                  aria-haspopup="true"
                >
                  Services
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      servicesOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Dropdown Panel */}
                {servicesOpen && (
                  <div className="absolute left-1/2 top-full mt-2 w-[560px] -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
                    {/* Core Services */}
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                      Core Services
                    </p>
                    <div className="space-y-2 mb-5">
                      {coreServices.map((svc) => (
                        <Link
                          key={svc.href}
                          href={svc.href}
                          onClick={() => setServicesOpen(false)}
                          className="group flex items-start gap-3 rounded-xl p-3 hover:bg-brand-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 group-hover:text-brand-700">
                              {svc.title}
                            </p>
                            <p className="text-xs text-neutral-500 mt-0.5 leading-snug">
                              {svc.description}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 mt-0.5 flex-shrink-0 transition-colors" />
                        </Link>
                      ))}
                    </div>

                    {/* Add-on Services */}
                    <div className="border-t border-neutral-100 pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                        Additional Support
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {addOnServices.map((svc) => (
                          <Link
                            key={svc.href}
                            href={svc.href}
                            onClick={() => setServicesOpen(false)}
                            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 bg-neutral-50 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                          >
                            {svc.title}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* View All */}
                    <div className="border-t border-neutral-100 mt-4 pt-4">
                      <Link
                        href="/services"
                        onClick={() => setServicesOpen(false)}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        View all services
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Regular nav links */}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-base font-medium transition-colors",
                    isActive(link.href)
                      ? "text-brand-700 bg-brand-50"
                      : "text-neutral-600 hover:text-brand-700 hover:bg-brand-50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Button asChild size="lg">
                <Link href="/book">Book a Call</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-md text-neutral-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-[min(360px,100vw)] bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md text-neutral-500 hover:text-neutral-700"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="px-4 py-6 space-y-1" aria-label="Mobile navigation">
              {/* Services accordion */}
              <div>
                <button
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                  className="flex w-full items-center justify-between px-3 py-3 rounded-lg text-base font-medium text-neutral-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  Services
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 transition-transform duration-200 text-neutral-400",
                      mobileServicesOpen && "rotate-180"
                    )}
                  />
                </button>
                {mobileServicesOpen && (
                  <div className="pl-3 mt-1 space-y-1">
                    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                      Core Services
                    </p>
                    {coreServices.map((svc) => (
                      <Link
                        key={svc.href}
                        href={svc.href}
                        className="block px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                      >
                        {svc.title}
                      </Link>
                    ))}
                    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 mt-2">
                      Additional Support
                    </p>
                    {addOnServices.map((svc) => (
                      <Link
                        key={svc.href}
                        href={svc.href}
                        className="block px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                      >
                        {svc.title}
                      </Link>
                    ))}
                    <Link
                      href="/services"
                      className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
                    >
                      View all services →
                    </Link>
                  </div>
                )}
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "block px-3 py-3 rounded-lg text-base font-medium transition-colors",
                    isActive(link.href)
                      ? "text-brand-700 bg-brand-50"
                      : "text-neutral-700 hover:bg-brand-50 hover:text-brand-700"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile CTA */}
            <div className="px-4 pb-8 pt-2 border-t border-neutral-100">
              <Button asChild size="lg" className="w-full">
                <Link href="/book">Book a Call</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
