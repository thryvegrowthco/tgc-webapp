import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RachelProfileCircle } from "@/components/shared/RachelPhoto";

export function AboutCTA() {
  return (
    <section className="py-20 lg:py-28 bg-brand-700">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">

        {/* Profile photo */}
        <div className="flex justify-center mb-6">
          <RachelProfileCircle size="lg" />
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
          Let&apos;s Work Together
        </h2>
        <p className="text-brand-200 text-lg leading-relaxed max-w-xl mx-auto mb-10">
          If you&apos;re ready to stop spinning your wheels and start making real
          progress — whether for yourself or your organization — I&apos;d love to
          connect.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="xl"
            className="bg-white text-brand-700 hover:bg-brand-50"
          >
            <Link href="/book">
              <Calendar className="h-5 w-5" />
              Book a Call
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="outline"
            className="border-brand-400 text-brand-100 hover:bg-brand-600 hover:text-white"
          >
            <Link href="/services">
              Explore Services
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
