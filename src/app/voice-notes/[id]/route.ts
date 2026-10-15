import { handleVoiceNote } from '@/features/addresses/handlers';
import { currentViewer } from '@/features/auth/viewer';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handleVoiceNote((await params).id, await currentViewer());
}
