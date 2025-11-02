type ErrorToastProps = {
  message: string;
};

export function ErrorToast({ message }: ErrorToastProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 shadow"
    >
      <span aria-hidden="true" className="mt-0.5 font-semibold">
        !
      </span>
      <p>{message}</p>
    </div>
  );
}
