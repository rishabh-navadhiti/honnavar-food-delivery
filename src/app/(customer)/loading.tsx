import { CustomerTabBarShell } from '@/features/cart/components/tab-bar-view';
import { LoadingFrame, SkeletonBox, SkeletonRow } from '@/shared/ui/route-states';

/** Home while loading (FR-024, research R10): the same boxes as the real page, so nothing moves. */
export default function CustomerLoading() {
  return (
    <>
      <LoadingFrame>
        <SkeletonBox className="h-8 w-3/4" />
        <SkeletonBox className="h-[52px]" />
        <div className="flex gap-1.5">
          <SkeletonBox className="h-[38px] w-28 rounded-full" />
          <SkeletonBox className="h-[38px] w-24 rounded-full" />
          <SkeletonBox className="h-[38px] w-28 rounded-full" />
        </div>
        <SkeletonBox className="h-12 rounded-full" />
        <div className="rounded-lg bg-surface px-3 shadow-1">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </LoadingFrame>
      <CustomerTabBarShell />
    </>
  );
}
