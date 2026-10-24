import type { Metadata } from "next";
import { AboutHero } from "@/components/marketing/about/AboutHero";
import { AboutRachelBio } from "@/components/marketing/about/AboutRachelBio";
import { AboutTGC } from "@/components/marketing/about/AboutTGC";
import { AboutMissionValues } from "@/components/marketing/about/AboutMissionValues";
import { AboutCTA } from "@/components/marketing/about/AboutCTA";
import { pageMeta } from "@/lib/seo/page-meta";

export const metadata: Metadata = pageMeta("/about", {
  title: "About",
  description:
    "Meet Rachel, founder of Thryve Growth Co. An HR professional, career coach, and the person behind 10+ years of real-world experience helping leaders and individuals grow with clarity and accountability.",
  shareDescription:
    "Real experience. Real growth. Meet Rachel and learn how Thryve Growth Co. came to be.",
});

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutRachelBio />
      <AboutTGC />
      <AboutMissionValues />
      <AboutCTA />
    </>
  );
}
