import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireAdminKitchen } from '@/features/kitchens/admin-page-helpers';
import { CategoryEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ id: string; categoryId: string }> };

export default async function AdminEditCategoryPage({ params }: Props) {
  const kitchen = await requireAdminKitchen(params);
  const categoryId = z.uuid().safeParse((await params).categoryId);
  if (!categoryId.success) notFound();
  return <CategoryEditorPage surface="admin" kitchenId={kitchen.id} basePath={`/admin/partners/${kitchen.id}`} categoryId={categoryId.data} />;
}
