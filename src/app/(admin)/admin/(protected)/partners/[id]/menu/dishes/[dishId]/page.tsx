import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireAdminKitchen } from '@/features/kitchens/admin-page-helpers';
import { DishEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ id: string; dishId: string }> };

export default async function AdminEditDishPage({ params }: Props) {
  const kitchen = await requireAdminKitchen(params);
  const dishId = z.uuid().safeParse((await params).dishId);
  if (!dishId.success) notFound();
  return <DishEditorPage surface="admin" kitchenId={kitchen.id} basePath={`/admin/partners/${kitchen.id}`} dishId={dishId.data} />;
}
