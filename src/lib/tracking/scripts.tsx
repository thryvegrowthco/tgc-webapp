// Per-provider tracking-pixel snippets. The snippets are the boilerplate each
// vendor publishes in their setup docs, with the pixel ID interpolated in.
//
// Single map drives:
//   • buildScripts(pixel)  → JSX rendered by <TrackingScripts /> after consent
//   • OPT_OUT_LINKS        → per-provider opt-out URLs surfaced in /privacy
//
// Adding a new provider is one entry in PROVIDER_SCRIPTS plus a seed row in
// the tracking_pixels table.

import Script from "next/script";
import type { TrackingPixel } from "@/types/database";

interface ScriptSpec {
  /** Friendly label for the provider — surfaced in /privacy and docs. */
  label: string;
  /** Public opt-out URL — surfaced as a link in /privacy when this pixel is live. */
  optOutUrl?: string;
  /** Render the actual <Script> tags. Caller already verified pixelId is non-empty. */
  render(pixelId: string): React.ReactNode;
}

export const PROVIDER_SCRIPTS: Record<string, ScriptSpec> = {
  google_analytics_4: {
    label: "Google Analytics 4 (Google)",
    optOutUrl: "https://tools.google.com/dlpage/gaoptout",
    render: (pixelId) => (
      <>
        <Script
          id={`ga4-loader-${pixelId}`}
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${pixelId}`}
        />
        <Script id={`ga4-init-${pixelId}`} strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${pixelId}');
          `}
        </Script>
      </>
    ),
  },

  google_tag_manager: {
    label: "Google Tag Manager (Google)",
    optOutUrl: "https://tools.google.com/dlpage/gaoptout",
    render: (pixelId) => (
      <Script id={`gtm-${pixelId}`} strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){
            w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),
              dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
            f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${pixelId}');
        `}
      </Script>
    ),
  },

  meta_pixel: {
    label: "Meta Pixel (Meta — Facebook + Instagram)",
    optOutUrl: "https://www.facebook.com/help/568137493302217",
    render: (pixelId) => (
      <Script id={`meta-pixel-${pixelId}`} strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
    ),
  },

  google_ads: {
    label: "Google Ads (Google)",
    optOutUrl: "https://adssettings.google.com/",
    render: (pixelId) => (
      <>
        <Script
          id={`google-ads-loader-${pixelId}`}
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${pixelId}`}
        />
        <Script id={`google-ads-init-${pixelId}`} strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${pixelId}');
          `}
        </Script>
      </>
    ),
  },

  linkedin_insight: {
    label: "LinkedIn Insight Tag (LinkedIn)",
    optOutUrl: "https://www.linkedin.com/psettings/guest-controls/retargeting-opt-out",
    render: (pixelId) => (
      <>
        <Script id={`linkedin-insight-init-${pixelId}`} strategy="afterInteractive">
          {`
            _linkedin_partner_id = "${pixelId}";
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          `}
        </Script>
        <Script
          id={`linkedin-insight-loader-${pixelId}`}
          strategy="afterInteractive"
          src="https://snap.licdn.com/li.lms-analytics/insight.min.js"
        />
      </>
    ),
  },

  microsoft_clarity: {
    label: "Microsoft Clarity (Microsoft)",
    optOutUrl: "https://privacy.microsoft.com/en-us/privacystatement",
    render: (pixelId) => (
      <Script id={`clarity-${pixelId}`} strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${pixelId}");
        `}
      </Script>
    ),
  },
};

/** Render the <Script> tags for one pixel. Returns null if provider is unrecognized. */
export function buildScripts(pixel: TrackingPixel): React.ReactNode {
  const spec = PROVIDER_SCRIPTS[pixel.provider];
  if (!spec || !pixel.pixel_id) return null;
  return spec.render(pixel.pixel_id);
}

/** Public label + opt-out URL for the privacy policy disclosure. */
export function getDisclosure(provider: string): { label: string; optOutUrl?: string } | null {
  const spec = PROVIDER_SCRIPTS[provider];
  if (!spec) return null;
  return { label: spec.label, optOutUrl: spec.optOutUrl };
}
