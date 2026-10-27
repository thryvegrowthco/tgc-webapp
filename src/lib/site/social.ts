// Single source of truth for Thryve Growth Co.'s public social profiles. Use
// these instead of hardcoding URLs so the contact page, business card, and any
// header/footer links can never drift apart.
export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/company/thryvegrowthco/",
  instagram: "https://www.instagram.com/thryvegrowthco/",
} as const;

// Rachel's personal LinkedIn (confirm with owner).
export const RACHEL_LINKEDIN = "https://www.linkedin.com/in/racheldietzhr";

// TODO(owner): paste the Google Business Profile share URL. Stays null until
// filled; consumers must omit it from sameAs / profile lists while it is null.
export const GOOGLE_BUSINESS_PROFILE_URL: string | null = null;
