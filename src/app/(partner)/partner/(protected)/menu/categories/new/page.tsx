import { requireSession } from '@/features/auth/session';
import { CategoryEditorPage } from '@/features/menu/components/editor-pages';

export default async function PartnerNewCategoryPage() {
  const session = await requireSession('partner');
  return <CategoryEditorPage surface="partner" kitchenId={session.kitchenId!} basePath="/partner" />;
}
