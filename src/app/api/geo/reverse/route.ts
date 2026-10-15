import { handleGeoReverse } from '@/features/addresses/handlers';
import { currentViewer } from '@/features/auth/viewer';

export async function GET(request: Request): Promise<Response> {
  return handleGeoReverse(new URL(request.url), await currentViewer());
}
