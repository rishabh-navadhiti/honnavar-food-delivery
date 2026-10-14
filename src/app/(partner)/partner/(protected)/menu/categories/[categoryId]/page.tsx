import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { CategoryEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ categoryId: string }> };

export default async function PartnerEditCategoryPage({ params }: Props) {
  const session = await requireSession('partner');
  const id = z.uuid().safeParse((await params).categoryId);
  if (!id.success) notFound();
  return <CategoryEditorPage surface="partner" kitchenId={session.kitchenId!} basePath="/partner" categoryId={id.data} />;
}
