import { LoadingFrame, SkeletonBox, SkeletonCard } from '@/shared/ui/route-states';

/** One partner order while loading (FR-024). */
export default function PartnerOrderLoading() {
  return (
    <LoadingFrame>
      <SkeletonBox className="h-6 w-32" />
      <SkeletonCard className="h-64" />
    </LoadingFrame>
  );
}
