import { requireAdminKitchen } from '@/features/kitchens/admin-page-helpers';
import { CategoryEditorPage } from '@/features/menu/components/editor-pages';

type Props = { params: Promise<{ id: string }> };

export default async function AdminNewCategoryPage({ params }: Props) {
  const kitchen = await requireAdminKitchen(params);
  return <CategoryEditorPage surface="admin" kitchenId={kitchen.id} basePath={`/admin/partners/${kitchen.id}`} />;
}
