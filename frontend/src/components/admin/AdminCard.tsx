type AdminCardProps = {
  label: string;
  value: string;
  accent?: string;
};

export function AdminCard({ label, value, accent = "text-primary" }: AdminCardProps) {
  return (
    <div className="glass-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
