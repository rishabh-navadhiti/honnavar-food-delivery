export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-base font-semibold text-danger">
      {message}
    </p>
  );
}

export function SavedMessage({ show, label }: { show?: boolean; label: string }) {
  if (!show) return null;
  return (
    <span role="status" className="font-medium text-open">
      {label}
    </span>
  );
}
