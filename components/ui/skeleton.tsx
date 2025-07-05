import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Specific skeleton components for better performance
function MenuItemSkeleton() {
  return (
    <div className="food-card">
      <Skeleton className="aspect-square w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

function CategorySkeleton() {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="col-span-2 h-12 mb-4" />
        {[...Array(4)].map((_, i) => (
          <MenuItemSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export { Skeleton, MenuItemSkeleton, CategorySkeleton }
