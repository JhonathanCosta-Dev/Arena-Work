// Instant navigation feedback: shown while the next page renders on the server.
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando" className="animate-pulse space-y-4 md:space-y-6">
      <div className="bg-card border-border h-44 rounded-3xl border" />
      <div className="bg-card h-16 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="bg-card border-border h-48 rounded-3xl border" />
        <div className="bg-card border-border h-48 rounded-3xl border" />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
