import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, FileText, Bell, ArrowRight, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, service_type, status, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, category, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const quickLinks = [
    {
      icon: Calendar,
      label: "Bookings",
      description: "View and manage your sessions",
      href: "/dashboard/bookings",
      count: bookings?.length ?? 0,
    },
    {
      icon: FileText,
      label: "Documents",
      description: "Access files Rachel shared with you",
      href: "/dashboard/documents",
      count: documents?.length ?? 0,
    },
    {
      icon: Bell,
      label: "Job Watchlist",
      description: "Your curated job matches",
      href: "/dashboard/watchlist",
      count: null,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          Hey, {firstName} 👋
        </h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Here&apos;s what&apos;s happening with your account.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-brand-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-brand-50 rounded-lg">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                {item.count !== null && (
                  <span className="text-xs font-semibold text-neutral-400 bg-neutral-100 rounded-full px-2 py-0.5">
                    {item.count}
                  </span>
                )}
              </div>
              <p className="font-semibold text-neutral-900 text-sm group-hover:text-brand-700 transition-colors">
                {item.label}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent bookings */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-neutral-900">Recent Bookings</h2>
          <Link href="/dashboard/bookings" className="text-xs text-brand-700 font-medium hover:text-brand-800 flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{b.service_type}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                  b.status === "confirmed" ? "bg-green-100 text-green-700"
                  : b.status === "pending" ? "bg-yellow-100 text-yellow-700"
                  : b.status === "completed" ? "bg-neutral-100 text-neutral-600"
                  : "bg-red-100 text-red-700"
                }`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No bookings yet."
            description="Ready to get started?"
            action={<Button asChild size="sm"><Link href="/book">Book a Call</Link></Button>}
          />
        )}
      </div>

      {/* Recent documents */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-neutral-900">Recent Documents</h2>
          <Link href="/dashboard/documents" className="text-xs text-brand-700 font-medium hover:text-brand-800 flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0">
                <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">{d.filename}</p>
                  <p className="text-xs text-neutral-400 capitalize">{d.category?.replace("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No documents yet."
            description="Rachel will upload files here as your work progresses."
          />
        )}
      </div>

      {/* Resources */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-brand-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-brand-800">New to the dashboard?</p>
            <p className="text-xs text-brand-700">Have questions? Reach out anytime at hello@thryvegrowth.co</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="flex-shrink-0 border-brand-300 text-brand-700 hover:bg-brand-100">
          <Link href="/contact">Contact Rachel</Link>
        </Button>
      </div>
    </div>
  );
}
