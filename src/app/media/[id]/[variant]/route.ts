import { readImageVariant } from '@/shared/images/store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VARIANTS = { s: 'small', l: 'large' } as const;

function notFound(): Response {
  return new Response(null, { status: 404 });
}

/** Serves stored photos. Image rows are content-addressed, so responses are cacheable forever. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
): Promise<Response> {
  const { id, variant } = await params;
  if (!UUID.test(id) || !(variant in VARIANTS)) return notFound();
  const bytes = await readImageVariant(id, VARIANTS[variant as keyof typeof VARIANTS]);
  if (!bytes) return notFound();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
