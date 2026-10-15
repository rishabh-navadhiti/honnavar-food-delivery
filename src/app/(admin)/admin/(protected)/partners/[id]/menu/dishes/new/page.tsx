import { z } from 'zod';
import { requireAdminKitchen } from '@/features/kitchens/admin-page-helpers';
import { DishEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ category?: string }> };

export default async function AdminNewDishPage({ params, searchParams }: Props) {
  const kitchen = await requireAdminKitchen(params);
  const category = z.uuid().safeParse((await searchParams).category);
  return (
    <DishEditorPage
      surface="admin"
      kitchenId={kitchen.id}
      basePath={`/admin/partners/${kitchen.id}`}
      categoryId={category.success ? category.data : undefined}
    />
  );
}
