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

export const metadata: Metadata = pageMeta("/faq", {
  title: "FAQ",
  description:
    "Frequently asked questions about Thryve Growth Co. services, pricing, how coaching works, and what to expect.",
});

// Single source of truth for the FAQ content. Exported so the page can build
// FAQPage JSON-LD (see the JsonLd block below) from the same questions and
// answers the accordion renders. All answers are plain text (no JSX) so the
// visible answer and the schema `acceptedAnswer.text` stay identical.
export const faqCategories = [
  {
    heading: "Getting Started",
    items: [
      {
        q: "What is Thryve Growth Co.?",
        a: "Thryve Growth Co. is an HR consulting and career coaching practice founded by Rachel Dietz, PHR, and based in Sun Prairie, Wisconsin. Rachel helps professionals with coaching, interview prep, and resumes, and helps small businesses with HR, hiring, and culture. Everything is delivered virtually, so clients can be anywhere in the U.S.",
      },
      {
        q: "Who is Rachel Dietz?",
        a: "Rachel is the founder of Thryve Growth Co. and a PHR-certified HR professional with more than 10 years of experience, including years in public-sector HR. She started in assistant-level HR roles and worked her way into senior HR leadership, so she has seen hiring, performance, and culture from the inside.",
      },
      {
        q: "How do I know if Thryve Growth Co. is the right fit for me?",
        a: "The best way to find out is to book a call. We'll talk about what's going on, what you're looking to get out of working together, and whether I'm the right person to help. I'll be honest if I don't think I'm the right fit. I'd rather tell you that upfront than take your money and underdeliver.",
      },
      {
        q: "Is the first call really free?",
        a: "Yes. The first call is a free 30-minute video conversation with Rachel, with no payment information required. You'll get an honest read on whether she can help and what your next step should be.",
      },
      {
        q: "How do I book a paid session?",
        a: "New clients start with a free 30-minute consultation. After the call, Rachel emails you a personal booking link with times that work.",
      },
      {
        q: "What happens after I book a call?",
        a: "Once you submit your inquiry, I'll review it personally and reach out within 1 to 2 business days to confirm your call and send a calendar invite. Our first conversation is about understanding your situation, not a sales pitch.",
      },
      {
        q: "Do you work with individuals and businesses?",
        a: "Yes, both. My core services are split between individual career and coaching services (for people navigating careers, transitions, and leadership) and organizational services (HR consulting and culture work for businesses and teams).",
      },
      {
        q: "Do you work with clients virtually?",
        a: "All sessions are conducted virtually, which means I work with clients nationwide. You don't need to be in any particular location.",
      },
      {
        q: "Do you work with clients outside Wisconsin?",
        a: "Yes. Rachel is based in Sun Prairie, Wisconsin, and works with clients nationwide. All sessions happen over video.",
      },
    ],
  },
  {
    heading: "Coaching & Services",
    items: [
      {
        q: "What does a coaching session look like?",
        a: "Sessions are 60 minutes, conducted via video call. We'll typically start by reviewing where you are relative to your goals or actions from our last session, dig into whatever is most pressing, and close with clear next steps and accountability. Every session is focused and practical, not freeform conversation.",
      },
      {
        q: "How many sessions will I need?",
        a: "It depends on what you're working on. Some people come in for a single focused session on a specific challenge. Others work with me over several months on a bigger goal like a career transition or leadership development. We'll figure out the right cadence based on your situation.",
      },
      {
        q: "What's the difference between coaching and HR consulting?",
        a: "Coaching is 1:1 work on your own career or leadership goals. HR consulting is work with a business on its people systems, such as roles, hiring, performance, onboarding, and culture. Some clients use both.",
      },
      {
        q: "Can a small business hire Thryve Growth Co. instead of a full-time HR person?",
        a: "Yes. Many small businesses don't need a full-time HR hire yet. Rachel offers hourly HR support at $125 an hour and scoped projects starting at $500.",
      },
      {
        q: "Do you offer ongoing retainer relationships for businesses?",
        a: "Yes. For HR consulting, many businesses benefit from ongoing strategic HR support rather than a one-time project. We'd discuss what that looks like based on your needs during our initial call.",
      },
    ],
  },
  {
    heading: "Pricing & Payments",
    items: [
      {
        q: "Why is your pricing listed publicly?",
        a: "Because you deserve to know what you're getting into before we ever talk. No one should have to sit through a discovery call just to find out if they can afford the service. Transparency is part of how I operate.",
      },
      {
        q: "How much does career coaching cost?",
        a: "A single 60-minute coaching session is $125. The 4-Session Coaching Plan is $425.",
      },
      {
        q: "Do you offer payment plans?",
        a: "For packages and larger organizational engagements, I'm open to discussing payment arrangements that make sense. Reach out and let's talk.",
      },
      {
        q: "What's your refund policy?",
        a: "For sessions already completed, I don't offer refunds, but I do take responsibility for the quality of my work. If you're not getting value from our sessions, I want to know. For unused sessions in a package, those can be applied to a future engagement.",
      },
      {
        q: "Can I use my employer's professional development budget?",
        a: "Often, yes. Coaching and interview prep usually qualify for professional development funds. I can provide an invoice and receipt for your employer.",
      },
    ],
  },
  {
    heading: "Resume & Interview Services",
    items: [
      {
        q: "How much does a resume rewrite cost?",
        a: "A full resume rewrite is $150. It includes a 30-minute intake call, a complete rewrite in an ATS-friendly format, two rounds of revisions, and final Word and PDF files. If you only need feedback, Resume Review and Edits is $75.",
      },
      {
        q: "How long does a resume rewrite take?",
        a: "Full resume rewrites are delivered within 5 business days of our intake call. Revisions are included as listed on the Resume and Career Materials page, and I'll confirm your timeline when we start.",
      },
      {
        q: "Do you write resumes for all industries?",
        a: "I work with professionals across most industries. If your field is highly specialized (engineering, medicine, academic/CV format), let's talk first to make sure I'm the right fit.",
      },
      {
        q: "What if I have an interview scheduled very soon?",
        a: "Reach out directly and let me know your timeline. I'll do my best to accommodate urgent requests.",
      },
    ],
  },
  {
    heading: "Job Alerts & Watchlists",
    items: [
      {
        q: "How are job matches curated?",
        a: "Two ways: I personally review and add jobs that I think are a strong fit for your profile, and your watchlist is also populated from automated job board feeds filtered to your criteria. You get both human judgment and comprehensive coverage.",
      },
      {
        q: "How often are new matches added?",
        a: "Automated matches are updated regularly as new listings appear. My manual curation happens on a regular cadence throughout the month.",
      },
      {
        q: "Can I update my watchlist preferences?",
        a: "Yes. Log into your dashboard anytime to update your watchlist profile. As your search evolves, your criteria can evolve too.",
      },
      {
        q: "Is there a minimum commitment for the Job Alerts subscription?",
        a: "No. It's month-to-month and you can cancel anytime.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
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
