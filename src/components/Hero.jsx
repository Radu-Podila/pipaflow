import { ArrowRight, Zap, Shield, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Hero({ onStart }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white text-[var(--color-fg)]">
      {/* Aggressive striped background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--color-fg) 0 12px, transparent 12px 24px)',
        }}
      />

      {/* Top warning bar */}
      <div className="relative z-10 flex items-center justify-between border-b-[3px] border-black bg-[var(--color-danger)] px-6 py-2 text-white">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]">
          ▲ Pipaflow · v0.1 · Browser-Only Mode
        </span>
        <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.25em] sm:inline">
          No cloud · No tracking · No bullshit
        </span>
      </div>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-start px-6 pt-16 pb-24 sm:pt-24">
        {/* eyebrow */}
        <span className="mb-6 inline-flex items-center gap-2 border-[2.5px] border-black bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] shadow-[3px_3px_0_0_var(--color-line)]">
          <span className="h-2 w-2 animate-pulse bg-[var(--color-danger)]" />
          Open source · MIT
        </span>

        <h1 className="font-display text-[64px] leading-[0.92] font-black tracking-[-0.04em] sm:text-[96px] md:text-[120px]">
          THINK
          <br />
          <span className="relative inline-block">
            <span className="relative z-10 text-white">FLOWS</span>
            <span
              aria-hidden
              className="absolute inset-0 -z-0 -translate-y-[6px] translate-x-[6px] bg-[var(--color-danger)]"
            />
            <span
              aria-hidden
              className="absolute inset-0 -z-0 bg-black"
            />
          </span>
          <br />
          FAST.
        </h1>

        <p className="mt-10 max-w-xl text-lg font-medium text-[var(--color-fg-soft)] sm:text-xl">
          Editor de flowuri logice fără frustrare. Drag bule.
          Conectează-le. Exportă. Totul rămâne în browser-ul tău.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button onClick={onStart} variant="primary" size="lg" className="text-sm">
            Deschide editorul
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <a
            href="https://github.com/Radu-Podila/pipaflow"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-soft)] underline-offset-4 hover:text-[var(--color-danger)] hover:underline"
          >
            github.com/Radu-Podila/pipaflow ↗
          </a>
        </div>

        {/* feature grid */}
        <div className="mt-20 grid w-full grid-cols-1 gap-0 border-[2.5px] border-black sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: '0-friction',
              body: 'Fără cont. Fără setup. Apeși un buton, desenezi un flow.',
            },
            {
              icon: Shield,
              title: 'Browser-bound',
              body: 'Datele stau în localStorage. Cloud sync e opt-in, nu default.',
            },
            {
              icon: GitBranch,
              title: 'Open source',
              body: 'Cod MIT pe GitHub. Fork it, ruin it, improve it.',
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className={`flex flex-col gap-3 bg-white p-6 ${
                i < 2 ? 'border-b-[2.5px] sm:border-b-0 sm:border-r-[2.5px] border-black' : ''
              }`}
            >
              <f.icon className="h-6 w-6 text-[var(--color-danger)]" strokeWidth={2.5} />
              <h3 className="font-display text-xl font-bold tracking-tight">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-fg-soft)]">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        {/* footer detail */}
        <div className="mt-12 flex w-full flex-wrap items-center justify-between gap-4 border-t-[2.5px] border-dashed border-black pt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-fg-mute)]">
          <span>// React 19 · @xyflow · @dagrejs · Tailwind v4</span>
          <span>Built fast for thinking fast</span>
        </div>
      </main>
    </div>
  );
}
