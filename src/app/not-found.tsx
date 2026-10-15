import { RouteNotFound } from '@/shared/ui/route-states';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl">
      <RouteNotFound homeHref="/" />
    </main>
  );
}
