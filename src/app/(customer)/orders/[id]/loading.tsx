import { CustomerTabBarShell } from '@/features/cart/components/tab-bar-view';
import { LoadingFrame, SkeletonBox, SkeletonCard } from '@/shared/ui/route-states';

/** Order page while loading: status card, timeline and map in their real sizes. */
export default function OrderLoading() {
  return (
    <>
      <LoadingFrame>
        <SkeletonBox className="h-6 w-32" />
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-56" />
      </LoadingFrame>
      <CustomerTabBarShell />
    </>
  );
}
