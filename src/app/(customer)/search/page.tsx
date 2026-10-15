import { redirect } from 'next/navigation';
import { z } from 'zod';

type Props = { searchParams: Promise<{ q?: string | string[] }> };

/** Search now lives on the home screen (002 convergence); old /search links keep working. */
export default async function SearchPage({ searchParams }: Props) {
  const q = z.string().trim().max(80).catch('').parse((await searchParams).q);
  redirect(q ? `/?${new URLSearchParams({ q })}` : '/');
}
