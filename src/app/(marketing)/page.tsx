import type { Metadata } from "next";
import { HomeHero } from "@/components/marketing/home/HomeHero";
import { HomeIntro } from "@/components/marketing/home/HomeIntro";
import { HomeServicesOverview } from "@/components/marketing/home/HomeServicesOverview";
import { HomeYourDifference } from "@/components/marketing/home/HomeYourDifference";
import { HomeHowWeWork } from "@/components/marketing/home/HomeHowWeWork";
import { HomeFinalCTA } from "@/components/marketing/home/HomeFinalCTA";

export const metadata: Metadata = {
  title: "HR Consulting & Career Coaching | Thryve Growth Co.",
  description:
    "Grow Better Leaders. Build Stronger Teams. Move Careers Forward. Real-world HR consulting and career coaching grounded in clarity, accountability, and honest guidance.",
  openGraph: {
    title: "Thryve Growth Co. | HR Consulting & Career Coaching",
    description:
      "Grow Better Leaders. Build Stronger Teams. Move Careers Forward. Real-world HR expertise meets honest career coaching.",
  },
};

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
