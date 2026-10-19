import { LoadingFrame, SkeletonBox } from '@/shared/ui/route-states';

/** Kitchen page while loading: hero, header card and dish rows in their real sizes. */
export default function KitchenLoading() {
  return (
    <LoadingFrame>
      <SkeletonBox className="h-6 w-32" />
      <SkeletonBox className="-mx-4 aspect-[16/9] rounded-none" />
      <div className="relative -mt-14 mx-1 flex flex-col gap-2.5 rounded-lg bg-surface p-3 shadow-2">
        <SkeletonBox className="h-7 w-2/3" />
        <SkeletonBox className="h-6 w-1/2" />
        <SkeletonBox className="h-6 w-3/5" />
        <SkeletonBox className="h-12" />
      </div>
      <SkeletonBox className="h-12 rounded-full" />
      <div className="flex flex-col gap-4 rounded-lg bg-surface p-3 shadow-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <SkeletonBox className="h-4 w-16" />
              <SkeletonBox className="h-5 w-3/4" />
              <SkeletonBox className="h-5 w-16" />
            </div>
            <SkeletonBox className="size-28" />
          </div>
        ))}
      </div>
    </LoadingFrame>
  );
}
