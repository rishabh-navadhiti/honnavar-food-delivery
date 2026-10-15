import { requireSession } from '@/features/auth/session';
import { MenuEditorPage } from '@/features/menu/components/editor-pages';

type Props = { searchParams: Promise<{ saved?: string; missing?: string }> };

export default async function PartnerMenuPage({ searchParams }: Props) {
  const session = await requireSession('partner');
  const { saved, missing } = await searchParams;
  return <MenuEditorPage surface="partner" kitchenId={session.kitchenId!} basePath="/partner" saved={saved} missing={missing} />;
}
