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
    "Meet Rachel Dietz, PHR, founder of Thryve Growth Co. 10+ years in HR, now helping professionals and small businesses grow with honest, practical guidance.",
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
