'use server';

import { revalidatePath } from 'next/cache';
import { formOptionalId, formText, formValues } from '@/shared/forms';
import type { ResultError } from '@/shared/result';
import { runAsKitchenActor } from '../../auth/action-helpers';
import type { WeekHoursInput } from '../schemas';
import { closeTemporarily, reopen, saveHours } from '../services/operations';

export async function closeTemporarilyAction(formData: FormData): Promise<void> {
  await runAsKitchenActor('closeTemporarilyAction', formData, (actor) =>
    closeTemporarily(actor, { kitchenId: formOptionalId(formData, 'kitchenId') }),
  );
  revalidatePath('/', 'layout');
}

export async function reopenAction(formData: FormData): Promise<void> {
  await runAsKitchenActor('reopenAction', formData, (actor) => reopen(actor, { kitchenId: formOptionalId(formData, 'kitchenId') }));
  revalidatePath('/', 'layout');
}

export type HoursFormState = { values?: Record<string, string>; error?: ResultError; saved?: boolean };

/** Hours editor fields: h<day>_closed, h<day>_<slot>_opens, h<day>_<slot>_closes (slot 1 or 2). */
function readHours(formData: FormData): WeekHoursInput {
  const hours: WeekHoursInput = {};
  for (let day = 1; day <= 7; day += 1) {
    const ranges: { opens: string; closes: string }[] = [];
    if (formText(formData, `h${day}_closed`) !== 'on') {
      for (const slot of [1, 2]) {
        const opens = formText(formData, `h${day}_${slot}_opens`).trim();
        const closes = formText(formData, `h${day}_${slot}_closes`).trim();
        if (!opens && !closes) continue;
        // A closing time of 00:00 means midnight.
        ranges.push({ opens, closes: closes === '00:00' ? '24:00' : closes });
      }
    }
    hours[String(day)] = ranges;
  }
  return hours;
}

export async function saveHoursAction(_previous: HoursFormState, formData: FormData): Promise<HoursFormState> {
  const values = formValues(formData);
  const { result } = await runAsKitchenActor('saveHoursAction', formData, (actor) =>
    saveHours(actor, { kitchenId: formOptionalId(formData, 'kitchenId'), hours: readHours(formData) }),
  );
  if (!result.ok) return { values, error: result.error };
  revalidatePath('/', 'layout');
  return { values, saved: true };
}
