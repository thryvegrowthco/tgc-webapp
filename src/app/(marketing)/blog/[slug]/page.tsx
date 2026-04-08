import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { generateHTML } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { createClient } from "@/lib/supabase/server";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { RachelProfileCircle } from "@/components/shared/RachelPhoto";
import type { JSONContent } from "@tiptap/react";

// IMPORTANT: These extensions must stay in sync with the editor extensions in
// src/components/admin/RichTextEditor.tsx (inside useEditor → extensions: []).
// Adding or removing an extension in either file without updating the other
// causes blog posts to render incorrectly or produce empty output.
const renderExtensions = [
  StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false }),
  TiptapLink.configure({
    HTMLAttributes: { class: "text-brand-700 underline underline-offset-4" },
  }),
  TiptapImage.configure({
    HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-6" },
  }),
];

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, published_at, featured_image_path")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  return data;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      images: post.featured_image_path
        ? [{ url: post.featured_image_path }]
        : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const html = post.content
    ? generateHTML(post.content as JSONContent, renderExtensions)
    : "<p>No content yet.</p>";

  // Rough read time estimate: ~200 words per minute
  const wordCount = html.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <>
      {/* Post hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-12 border-b border-neutral-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-brand-700 font-medium hover:text-brand-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Clock className="h-3 w-3" /> {readTime} min read
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Calendar className="h-3 w-3" />
                {new Date(post.published_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight mb-4">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-neutral-600 leading-relaxed mb-6">{post.excerpt}</p>
          )}

          <div className="flex items-center gap-3">
            <RachelProfileCircle size="sm" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">Rachel</p>
              <p className="text-xs text-brand-700">Founder, Thryve Growth Co.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured image */}
      {post.featured_image_path && (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 -mt-8 mb-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.featured_image_path}
            alt={post.title}
            className="w-full rounded-2xl shadow-md object-cover max-h-80"
          />
        </div>
      )}

      {/* Post content */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div
            className="prose prose-neutral prose-lg max-w-none
              prose-headings:font-display prose-headings:font-bold prose-headings:text-neutral-900
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-neutral-700 prose-p:leading-relaxed
              prose-li:text-neutral-700
              prose-strong:text-neutral-900
              prose-a:text-brand-700 prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-4 prose-blockquote:border-brand-400 prose-blockquote:bg-brand-50 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:not-italic
              prose-code:bg-neutral-100 prose-code:rounded prose-code:px-1 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
              prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>

      {/* Author bio */}
      <section className="bg-neutral-50 border-t border-neutral-100 py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5">
            <RachelProfileCircle size="lg" />
            <div>
              <p className="font-semibold text-neutral-900 mb-1">Rachel</p>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Rachel is an HR professional and career coach with 10+ years of experience helping
                individuals and organizations grow with intention. She founded Thryve Growth Co.
                to bring honest, practical guidance to the people who need it most.
              </p>
              <Link
                href="/about"
                className="text-sm text-brand-700 font-medium hover:text-brand-800 mt-2 inline-block"
              >
                More about Rachel →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SectionCTA
        heading="Found This Useful?"
        body="If this resonated, a conversation might too. Book a call and let's talk about your specific situation."
        primaryLabel="Book a Call"
        secondaryLabel="Read More"
        secondaryHref="/blog"
        variant="light"
      />
    </>
  );
}
