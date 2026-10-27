import type { Metadata } from "next";
import { HomeHero } from "@/components/marketing/home/HomeHero";
import { HomeIntro } from "@/components/marketing/home/HomeIntro";
import { HomeServicesOverview } from "@/components/marketing/home/HomeServicesOverview";
import { HomeYourDifference } from "@/components/marketing/home/HomeYourDifference";
import { HomeHowWeWork } from "@/components/marketing/home/HomeHowWeWork";
import { HomeFinalCTA } from "@/components/marketing/home/HomeFinalCTA";
import { pageMeta } from "@/lib/seo/page-meta";

export const metadata: Metadata = pageMeta("/", {
  title: "HR Consulting & Career Coaching | Thryve Growth Co.",
  absoluteTitle: true,
  description:
    "HR consulting, career and leadership coaching, interview prep, and resume writing from Rachel Dietz, PHR. Based in Wisconsin, serving clients nationwide.",
  shareTitle: "Thryve Growth Co. | HR Consulting & Career Coaching",
  shareDescription:
    "Grow Better Leaders. Build Stronger Teams. Move Careers Forward. Real-world HR expertise meets honest career coaching.",
});

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeIntro />
      <HomeServicesOverview />
      <HomeYourDifference />
      <HomeHowWeWork />
      <HomeFinalCTA />
    </>
  );
}
