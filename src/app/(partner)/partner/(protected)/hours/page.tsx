import { requireSession } from '@/features/auth/session';
import { HoursEditorPage } from '@/features/menu/components/editor-pages';

export default async function PartnerHoursPage() {
  const session = await requireSession('partner');
  return <HoursEditorPage surface="partner" kitchenId={session.kitchenId!} basePath="/partner" />;
}
