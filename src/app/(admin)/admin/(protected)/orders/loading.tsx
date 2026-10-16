import { LoadingFrame, SkeletonBox, SkeletonCard } from '@/shared/ui/route-states';

/** The dispatch board while loading: five columns of cards in their real sizes (FR-024). */
export default function DispatchLoading() {
  return (
    <LoadingFrame>
      <SkeletonBox className="h-8 w-56" />
      <div className="grid grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg bg-surface-sunk p-2">
            <SkeletonBox className="h-8" />
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-36" />
          </div>
        ))}
      </div>
    </LoadingFrame>
  );
}
