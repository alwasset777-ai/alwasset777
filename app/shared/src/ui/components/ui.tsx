import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-canvas',
        variant === 'ghost' && 'text-muted hover:bg-canvas hover:text-ink',
        variant === 'danger' && 'border border-brand-600 bg-white text-brand-600 hover:bg-brand-50',
        className,
      )}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, p.className)} />;
}

export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(inputCls, p.className)} />;
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-white', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="border-s-4 border-brand-600 ps-3 text-2xl font-bold text-ink">{children}</h1>
      {actions}
    </div>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'info' | 'success'; children: ReactNode }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-lg border px-3 py-2 text-sm',
        kind === 'error' && 'border-brand-100 bg-brand-50 text-brand-700',
        kind === 'info' && 'border-line bg-canvas text-ink',
        kind === 'success' && 'border-green-200 bg-green-50 text-green-800',
      )}
    >
      {children}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-50 text-green-800 border-green-200',
  reserved: 'bg-amber-50 text-amber-800 border-amber-200',
  rented: 'bg-blue-50 text-blue-800 border-blue-200',
  sold: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  maintenance: 'bg-brand-50 text-brand-700 border-brand-100',
};

export function Badge({ tone, children }: { tone?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-block rounded-full border px-2 py-0.5 text-xs font-semibold', STATUS_COLORS[tone ?? ''] ?? 'border-line bg-canvas text-muted')}>
      {children}
    </span>
  );
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={cx('rounded-xl border bg-white p-4', accent ? 'border-brand-100' : 'border-line')}>
      <div className="text-sm text-muted">{label}</div>
      <div className={cx('mt-1 whitespace-nowrap text-xl font-bold xl:text-2xl', accent ? 'text-brand-600' : 'text-ink')}>{value}</div>
    </div>
  );
}

export function Spinner() {
  return <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />;
}
