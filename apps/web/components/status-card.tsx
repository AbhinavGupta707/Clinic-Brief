export function StatusCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-md border border-clinic-line bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-clinic-ink">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-clinic-muted">{children}</div>
    </article>
  );
}
