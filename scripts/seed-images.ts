/**
 * Downloads, converts to WebP, and uploads featured images for each blog post.
 * Run with:  npx tsx --env-file=.env.local scripts/seed-images.ts
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const IMAGES = [
  {
    slug: "how-to-prepare-for-a-behavioral-interview",
    unsplashId: "photo-1573497019940-1c28c88b4f3e",
    label: "Behavioral Interview",
  },
  {
    slug: "resume-mistakes-costing-you-job-offers",
    unsplashId: "photo-1586281380349-632531db7ed4",
    label: "Resume Mistakes",
  },
  {
    slug: "how-to-change-careers-without-starting-over",
    unsplashId: "photo-1507003211169-0a1dd7228f2d",
    label: "Career Change",
  },
  {
    slug: "what-strong-company-culture-actually-looks-like",
    unsplashId: "photo-1522071820081-009f0129c71c",
    label: "Company Culture",
  },
  {
    slug: "job-search-strategies-that-actually-work",
    unsplashId: "photo-1499750310107-5fef28a66643",
    label: "Job Search",
  },
];

async function processImage(item: (typeof IMAGES)[number]) {
  // Unsplash CDN serves WebP natively via fm=webp — no local conversion needed
  const url = `https://images.unsplash.com/${item.unsplashId}?w=1200&q=80&fit=crop&fm=webp`;
  const tmpWebp = join(tmpdir(), `thryve-${item.slug}.webp`);

  try {
    // 1. Download as WebP directly from Unsplash CDN
    console.log(`  Downloading ${item.label} as WebP…`);
    execSync(`curl -sL --max-time 30 "${url}" -o "${tmpWebp}"`);

    // 2. Read downloaded file
    const { readFileSync } = await import("fs");
    const webpBuffer = readFileSync(tmpWebp);

    // 4. Upload to public blog-images bucket
    const storagePath = `${item.slug}.webp`;
    console.log(`  Uploading to blog-images/${storagePath}…`);

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(storagePath, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 5. Get public URL
    const { data: urlData } = supabase.storage
      .from("blog-images")
      .getPublicUrl(storagePath);

    // 6. Update blog post
    const { error: dbError } = await supabase
      .from("blog_posts")
      .update({ featured_image_path: urlData.publicUrl })
      .eq("slug", item.slug);

    if (dbError) throw new Error(`DB update failed: ${dbError.message}`);

    console.log(`  ✓ Done — ${urlData.publicUrl}\n`);
  } finally {
    if (existsSync(tmpWebp)) unlinkSync(tmpWebp);
  }
}

async function ensureBucket() {
  // Create the public blog-images bucket if it doesn't exist
  const { error } = await supabase.storage.createBucket("blog-images", {
    public: true,
    fileSizeLimit: 10485760,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  // Ignore "already exists" error
  if (error && !error.message.includes("already exists")) {
    throw new Error(`Failed to create bucket: ${error.message}`);
  }
  console.log("✓ blog-images bucket ready\n");
}

async function main() {
  console.log("Seeding featured images…\n");
  await ensureBucket();

  for (const item of IMAGES) {
    console.log(`[${item.label}]`);
    try {
      await processImage(item);
    } catch (err) {
      console.error(`  ✗ Failed: ${err}\n`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
