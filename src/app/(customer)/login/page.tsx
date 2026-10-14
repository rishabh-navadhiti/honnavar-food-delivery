import { LoginScreen } from '@/features/auth/components/login-screen';

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <>
      <LoginScreen surface="customer" next={typeof next === 'string' ? next : undefined} />
    </>
  );
}
