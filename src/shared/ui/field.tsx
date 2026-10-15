import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldShellProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const control =
  'min-h-touch w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink ' +
  'focus:border-primary focus:outline-2 focus:outline-primary aria-invalid:border-danger';

type CommonProps = { name: string; label: ReactNode; hint?: ReactNode; error?: string; id?: string };

export function TextField({ name, label, hint, error, id, ...props }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? `field-${name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={control}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  error,
  id,
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldId = id ?? `field-${name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        name={name}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={control}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  hint,
  error,
  id,
  children,
  ...props
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? `field-${name}`;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={control}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/** A large, labelled checkbox (touch-friendly). */
export function CheckboxField({
  name,
  label,
  id,
  ...props
}: { name: string; label: ReactNode; id?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? `field-${name}`;
  return (
    <label htmlFor={fieldId} className="flex min-h-touch cursor-pointer items-center gap-3 text-base">
      <input id={fieldId} name={name} type="checkbox" className="size-6 accent-primary" {...props} />
      <span>{label}</span>
    </label>
  );
}
