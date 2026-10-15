import { z } from 'zod';
import { requireSession } from '@/features/auth/session';
import { DishEditorPage } from '@/features/menu/components/editor-pages';

type Props = { searchParams: Promise<{ category?: string }> };

export default async function PartnerNewDishPage({ searchParams }: Props) {
  const session = await requireSession('partner');
  const category = z.uuid().safeParse((await searchParams).category);
  return (
    <DishEditorPage
      surface="partner"
      kitchenId={session.kitchenId!}
      basePath="/partner"
      categoryId={category.success ? category.data : undefined}
    />
  );
}
