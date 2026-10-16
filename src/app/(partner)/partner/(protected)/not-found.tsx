import { RouteNotFound } from '@/shared/ui/route-states';

/** Not found inside the signed-in partner screens: keeps the surface's navigation (003, FR-024). */
export default function PartnerProtectedNotFound() {
  return <RouteNotFound homeHref="/partner" />;
}
