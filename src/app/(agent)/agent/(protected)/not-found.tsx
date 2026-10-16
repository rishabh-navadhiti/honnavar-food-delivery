import { RouteNotFound } from '@/shared/ui/route-states';

/** Not found inside the signed-in agent screens: keeps the surface's navigation (003, FR-024). */
export default function AgentProtectedNotFound() {
  return <RouteNotFound homeHref="/agent" />;
}
