import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/shared/ui/button';
import { signOutAction } from '../actions';
import type { Surface } from '../surfaces';

export function SignOutButton({ surface }: { surface: Surface }) {
  const t = useTranslations('common');
  return (
    <form action={signOutAction}>
      <input type="hidden" name="surface" value={surface} />
      <button type="submit" className={buttonClasses('ghost', 'whitespace-nowrap px-3')}>
        {t('signOut')}
      </button>
    </form>
  );
}
