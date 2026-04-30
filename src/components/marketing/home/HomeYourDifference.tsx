import { CheckCircle2 } from "lucide-react";

const differentiators = [
  "Real HR experience, not just frameworks and theory",
  "Direct, honest guidance, even when it's uncomfortable",
  "Practical tools and strategies you can actually use",
  "Accountability built into every engagement",
  "No cookie-cutter approaches; everything is tailored to you",
  "Someone in your corner who actually wants you to succeed",
];

export function HomeYourDifference() {
  return (
    <section className="py-20 lg:py-28 bg-brand-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Heading */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-1.5 mb-6">
              <span className="text-sm font-semibold text-brand-100 tracking-wide">
                What Sets This Apart
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-6">
              This Isn&apos;t One Size Fits All
            </h2>
            <p className="text-brand-200 text-lg leading-relaxed">
              You deserve more than generic advice and a PDF workbook. Growth
              happens when someone actually understands your situation, challenges
              your assumptions, and helps you build something that works for
              your real life, not a theoretical one.
            </p>
          </div>

          {/* Differentiators list */}
          <div>
            <ul className="space-y-4">
              {differentiators.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand-300 flex-shrink-0 mt-0.5" />
                  <span className="text-white font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
