import { LoadingFrame, SkeletonBox, SkeletonCard } from '@/shared/ui/route-states';

/** Agent home while loading: greeting, the two figures and two order cards in their real sizes (FR-024). */
export default function AgentLoading() {
  return (
    <LoadingFrame>
      <SkeletonBox className="h-8 w-2/3" />
      <div className="grid grid-cols-2 gap-2">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>
      <SkeletonCard className="h-40" />
      <SkeletonCard className="h-40" />
    </LoadingFrame>
  );
}
