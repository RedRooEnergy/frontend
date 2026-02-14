type AdminTopBarProps = {
  title: string;
  subtitle?: string;
};

export default function AdminTopBar({ title, subtitle }: AdminTopBarProps) {
  return (
    <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </header>
  );
}
