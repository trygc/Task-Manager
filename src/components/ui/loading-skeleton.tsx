import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800", className)}
      {...props}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-4 pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <Skeleton className="mb-4 h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <Skeleton className="mb-4 h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, CardSkeleton, TableSkeleton, DashboardSkeleton };