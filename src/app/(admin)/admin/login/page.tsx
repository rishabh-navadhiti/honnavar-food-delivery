import { LoginScreen } from '@/features/auth/components/login-screen';

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <main className="px-4 py-6">
      <LoginScreen surface="admin" next={typeof next === 'string' ? next : undefined} />
    </main>
  );
}
