import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { ContactForm } from "@/components/shared/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Rachel at Thryve Growth Co. Questions about services, pricing, or just want to say hello? Reach out.",
  openGraph: {
    title: "Contact | Thryve Growth Co.",
    description:
      "Get in touch with Thryve Growth Co. for questions, inquiries, or just to say hello.",
  },
};

const faqs = [
  {
    q: "How quickly do you respond?",
    a: "I personally respond to all inquiries within 1–2 business days.",
  },
  {
    q: "Do you work with clients outside my area?",
    a: "Yes, I work with clients nationwide. All sessions are conducted virtually.",
  },
  {
    q: "What if I'm not sure which service I need?",
    a: "That's completely fine. Just reach out and describe what's going on, and I'll help you figure out the best fit.",
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Page hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-20 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">
                Get in Touch
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Contact
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Have a question about services, pricing, or want to chat about
              whether Thryve Growth Co. is the right fit? I&apos;d love to hear from
              you.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-8">

              {/* Direct email */}
              <div>
                <h2 className="font-display text-lg font-bold text-neutral-900 mb-4">
                  Reach me directly
                </h2>
                <a
                  href="mailto:hello@thryvegrowth.co"
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 hover:border-brand-200 hover:bg-brand-50 transition-all group"
                >
                  <div className="p-2.5 bg-brand-100 rounded-lg group-hover:bg-brand-200 transition-colors">
                    <Mail className="h-5 w-5 text-brand-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Email</p>
                    <p className="text-sm text-brand-700">hello@thryvegrowth.co</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 ml-auto transition-colors" />
                </a>
              </div>

              {/* Social */}
              <div>
                <h2 className="font-display text-lg font-bold text-neutral-900 mb-4">
                  Connect on social
                </h2>
                <div className="space-y-3">
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 hover:border-brand-200 hover:bg-brand-50 transition-all group"
                  >
                    <div className="p-2.5 bg-neutral-100 rounded-lg group-hover:bg-brand-100 transition-colors">
                      <svg className="h-5 w-5 text-neutral-600 group-hover:text-brand-700 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">LinkedIn</p>
                      <p className="text-sm text-neutral-500">Thryve Growth Co.</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 ml-auto transition-colors" />
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 hover:border-brand-200 hover:bg-brand-50 transition-all group"
                  >
                    <div className="p-2.5 bg-neutral-100 rounded-lg group-hover:bg-brand-100 transition-colors">
                      <svg className="h-5 w-5 text-neutral-600 group-hover:text-brand-700 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Instagram</p>
                      <p className="text-sm text-neutral-500">@thryvegrowthco</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 ml-auto transition-colors" />
                  </a>
                </div>
              </div>

              {/* Quick FAQs */}
              <div>
                <h2 className="font-display text-lg font-bold text-neutral-900 mb-4">
                  Quick answers
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div key={faq.q} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-neutral-800 mb-1">{faq.q}</p>
                      <p className="text-sm text-neutral-600 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-brand-700 hover:text-brand-800 transition-colors"
                >
                  View all FAQs <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Book a call nudge */}
              <div className="rounded-xl bg-brand-700 p-5 text-white">
                <p className="font-semibold mb-2">Ready to get started?</p>
                <p className="text-sm text-brand-200 leading-relaxed mb-4">
                  Skip the back-and-forth. Book a call directly and let&apos;s talk
                  about what you need.
                </p>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-100 hover:text-white transition-colors"
                >
                  Book a call <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
                <h2 className="font-display text-xl font-bold text-neutral-900 mb-6">
                  Send a message
                </h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
