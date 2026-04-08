export function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 bg-neutral-200 rounded w-48" />
        <div className="h-4 bg-neutral-100 rounded w-64" />
      </div>
      <div className="h-96 bg-neutral-100 rounded-xl" />
    </div>
  );
}
