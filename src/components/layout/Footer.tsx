"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

const serviceLinks = [
  { label: "HR Consulting & Team Development", href: "/services/hr-consulting" },
  { label: "Career & Leadership Coaching", href: "/services/coaching" },
  { label: "Culture & Engagement Consulting", href: "/services/culture-engagement" },
  { label: "Interview Preparation", href: "/services/interview-prep" },
  { label: "Resume & Career Materials", href: "/services/resume-materials" },
  { label: "Job Alerts & Watchlists", href: "/services/job-alerts" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Investment", href: "/investment" },
  { label: "Packages", href: "/packages" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="bg-brand-900 text-white">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">

          {/* Column 1 — Brand */}
          <div className="lg:col-span-1">
            <Logo variant="dark" />
            <p className="mt-4 text-sm text-brand-200 leading-relaxed font-medium italic">
              Clarity. Accountability. Real Growth.
            </p>
            <p className="mt-3 text-sm text-brand-300 leading-relaxed">
              Practical HR consulting and coaching for individuals and organizations
              who want to grow with intention.
            </p>

            {/* Social Links */}
            <div className="mt-6 flex gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Thryve Growth Co. on LinkedIn"
                className="rounded-lg p-2 text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
              >
                {/* LinkedIn brand icon */}
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Thryve Growth Co. on Instagram"
                className="rounded-lg p-2 text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
              >
                {/* Instagram brand icon */}
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
              <a
                href="mailto:hello@thryvegrowth.co"
                aria-label="Email Thryve Growth Co."
                className="rounded-lg p-2 text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Column 2 — Services */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-4">
              Services
            </h3>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-200 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-4">
              Company
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-200 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Newsletter */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-400 mb-4">
              Stay Connected
            </h3>
            <p className="text-sm text-brand-200 leading-relaxed mb-4">
              Get practical growth tips, career insights, and updates from Rachel.
            </p>
            <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="First name"
                className="w-full rounded-lg px-4 py-2.5 text-sm bg-brand-800 border border-brand-700 text-white placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
              <input
                type="email"
                placeholder="Email address"
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm bg-brand-800 border border-brand-700 text-white placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full border-brand-500 text-brand-300 hover:bg-brand-800 hover:text-white"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-brand-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-brand-400">
            © {new Date().getFullYear()} Thryve Growth Co. LLC. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-brand-400 hover:text-brand-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-brand-400 hover:text-brand-200 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
