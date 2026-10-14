import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { DishEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ dishId: string }> };

export default async function PartnerEditDishPage({ params }: Props) {
  const session = await requireSession('partner');
  const id = z.uuid().safeParse((await params).dishId);
  if (!id.success) notFound();
  return <DishEditorPage surface="partner" kitchenId={session.kitchenId!} basePath="/partner" dishId={id.data} />;
}
