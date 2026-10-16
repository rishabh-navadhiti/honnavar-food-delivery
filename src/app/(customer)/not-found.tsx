import { CustomerTabBarShell } from '@/features/cart/components/tab-bar-view';
import { RouteNotFound } from '@/shared/ui/route-states';

export default function CustomerNotFound() {
  return (
    <>
      <RouteNotFound homeHref="/" />
      <CustomerTabBarShell />
    </>
  );
}
