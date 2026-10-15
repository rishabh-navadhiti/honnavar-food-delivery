import { redirect } from 'next/navigation';
import { requireSession } from '@/features/auth/session';

export default async function AdminHomePage() {
  await requireSession('admin');
  redirect('/admin/orders');
}
