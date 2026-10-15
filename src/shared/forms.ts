/** Small helpers for reading FormData in action wrappers. */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function formOptionalId(formData: FormData, name: string): string | undefined {
  const value = formText(formData, name).trim();
  return value ? value : undefined;
}

export function formChecked(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === 'on' || value === 'true' || value === '1';
}

/** An uploaded file as bytes, or undefined when no file was chosen. */
export async function formFile(formData: FormData, name: string): Promise<Buffer | undefined> {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return undefined;
  return Buffer.from(await value.arrayBuffer());
}

/** Plain string values of a form, to echo back after a failed save (files excluded). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && !key.startsWith('$ACTION')) values[key] = value;
  }
  return values;
}
