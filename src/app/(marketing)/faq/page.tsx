import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo/page-meta";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageGraph } from "@/lib/seo/schema";
import { faqCategories } from "@/lib/faq/data";

export const metadata: Metadata = pageMeta("/faq", {
  title: "FAQ",
  description:
    "Frequently asked questions about Thryve Growth Co. services, pricing, how coaching works, and what to expect.",
});

export default function FAQPage() {
  return (
    <>
      {/* FAQPage schema built from the same data the accordion renders, so every
          acceptedAnswer.text matches a visible answer. */}
      <JsonLd data={faqPageGraph(faqCategories.flatMap((cat) => cat.items))} />
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">FAQ</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Frequently Asked <span className="text-brand-700">Questions</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Answers to the things people usually want to know before reaching out.
              If your question isn&apos;t here, just{" "}
              <Link href="/contact" className="text-brand-700 font-medium hover:text-brand-800 underline underline-offset-4">
                send me a message
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-14">
          {faqCategories.map((cat) => (
            <div key={cat.heading}>
              <h2 className="font-display text-xl font-bold text-neutral-900 mb-4 pb-4 border-b border-neutral-200">
                {cat.heading}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {cat.items.map((item, i) => (
                  <AccordionItem key={i} value={`${cat.heading}-${i}`}>
                    <AccordionTrigger>{item.q}</AccordionTrigger>
                    {/* forceMount keeps every answer in the server HTML (for SEO and
                        no-JS readers); closed panels are hidden via CSS on the
                        data-state element. */}
                    <AccordionContent forceMount wrapperClassName="data-[state=closed]:hidden">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-14">
          <div className="bg-brand-50 rounded-2xl border border-brand-100 p-8 text-center">
            <h3 className="font-display text-lg font-bold text-neutral-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-neutral-600 text-sm mb-5">
              I&apos;m happy to answer anything before you commit to a thing. No pressure.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                Send a message <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="hidden sm:inline text-neutral-300">·</span>
              <Link href="/consultation" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                Book a Free 30-Minute Consultation Call <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SectionCTA
        heading="Ready to Get Started?"
        body="You've got the answers. Now let's put them to work."
        secondaryLabel="View Services"
        secondaryHref="/services"
        variant="light"
      />
    </>
  );
}
