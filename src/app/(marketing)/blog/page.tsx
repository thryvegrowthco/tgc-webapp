import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SectionCTA } from "@/components/shared/SectionCTA";
import { NewsletterForm } from "@/components/shared/NewsletterForm";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical insights on career growth, leadership, HR best practices, and professional development from Rachel at Thryve Growth Co.",
};

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, published_at, featured_image_path")
    .eq("published", true)
    .order("published_at", { ascending: false });

  const hasPosts = posts && posts.length > 0;

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-50 py-16 lg:py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-brand-800 tracking-wide">Blog</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight mb-4">
              Practical Insights for <span className="text-brand-700">Real Growth</span>
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Career advice, leadership insights, and HR perspective, grounded in real experience, not trends.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!hasPosts ? (
            <div className="bg-brand-50 border border-brand-100 rounded-xl px-5 py-4 flex items-center gap-3 max-w-2xl">
              <span className="text-brand-600 text-lg">✍️</span>
              <p className="text-sm text-brand-800">
                <span className="font-semibold">Posts coming soon.</span> Rachel is working on the first batch of articles. Subscribe below to be notified when they publish.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                // Rough read time from excerpt length (full content not fetched on index)
                const words = (post.excerpt ?? "").split(/\s+/).filter(Boolean).length;
                const readTime = Math.max(1, Math.round(words / 200)) || "~";

                return (
                  <article
                    key={post.id}
                    className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-brand-200 transition-all group flex flex-col"
                  >
                    {/* Featured image or placeholder */}
                    {post.featured_image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featured_image_path}
                        alt={post.title}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-300 text-4xl">✍️</span>
                      </div>
                    )}

                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {post.published_at && (
                          <span className="flex items-center gap-1 text-xs text-neutral-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.published_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-neutral-400">
                          <Clock className="h-3 w-3" />
                          {readTime} min read
                        </span>
                      </div>

                      <h2 className="font-display font-bold text-neutral-900 mb-2 group-hover:text-brand-700 transition-colors leading-snug">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-neutral-600 leading-relaxed mb-4 flex-1">
                          {post.excerpt}
                        </p>
                      )}

                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 mt-auto"
                      >
                        Read more <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter signup */}
      <section className="py-16 bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl font-bold text-neutral-900 mb-3">
            Get New Posts in Your Inbox
          </h2>
          <p className="text-neutral-600 text-sm mb-6">
            Practical career and leadership insights, no filler, no spam.
          </p>
          <NewsletterForm />
          <p className="text-xs text-neutral-400 mt-3">Unsubscribe anytime.</p>
        </div>
      </section>

      <SectionCTA
        heading="Want to Work Together?"
        body="The blog is one thing, but real growth happens in real conversations. Book a call and let's talk."
        primaryLabel="Book a Call"
        secondaryLabel="View Services"
        secondaryHref="/services"
        variant="light"
      />
    </>
  );
}
