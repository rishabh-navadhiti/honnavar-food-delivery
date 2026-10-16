import { LoadingFrame, SkeletonBox, SkeletonCard } from '@/shared/ui/route-states';

/** Cart while loading: lines, bill and the checkout choices in their real sizes. */
export default function CartLoading() {
  return (
    <LoadingFrame>
      <SkeletonBox className="h-6 w-32" />
      <SkeletonBox className="h-8 w-1/2" />
      <SkeletonCard className="h-44" />
      <SkeletonCard className="h-32" />
      <SkeletonCard className="h-24" />
    </LoadingFrame>
  );
}
