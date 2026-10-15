import 'server-only';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '../auth/session';
import { getKitchenRow } from './queries';

/** Every admin kitchen page: check the admin session itself, then load the kitchen or 404. */
export async function requireAdminKitchen(params: Promise<{ id: string }>) {
  await requireSession('admin');
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const kitchen = await getKitchenRow(id.data);
  if (!kitchen) notFound();
  return kitchen;
}
