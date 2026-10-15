import { handleGeoSearch } from '@/features/addresses/handlers';
import { currentViewer } from '@/features/auth/viewer';

export async function GET(request: Request): Promise<Response> {
  return handleGeoSearch(new URL(request.url), await currentViewer());
}
