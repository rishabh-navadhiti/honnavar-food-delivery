import { LoadingFrame, SkeletonBox, SkeletonCard } from '@/shared/ui/route-states';

/** Partner orders while loading: title row and three cards in their real sizes (FR-024). */
export default function PartnerOrdersLoading() {
  return (
    <LoadingFrame>
      <SkeletonBox className="h-8 w-1/2" />
      <SkeletonBox className="h-6 w-2/3" />
      <SkeletonCard className="h-56" />
      <SkeletonCard className="h-44" />
      <SkeletonCard className="h-44" />
    </LoadingFrame>
  );
}
