import { RouteNotFound } from '@/shared/ui/route-states';

/** Not found inside the signed-in admin screens: keeps the surface's navigation (003, FR-024). */
export default function AdminProtectedNotFound() {
  return <RouteNotFound homeHref="/admin" />;
}
