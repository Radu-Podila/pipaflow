import { ArrowRight, Zap, Shield, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n.jsx';

export default function Hero({ onStart }) {
  const { t, locale, setLocale } = useT();

  const features = [
    { icon: Zap,       title: t('hero.featNoFrictionTitle'), body: t('hero.featNoFrictionBody') },
    { icon: Shield,    title: t('hero.featBrowserTitle'),    body: t('hero.featBrowserBody') },
    { icon: GitBranch, title: t('hero.featOSSTitle'),        body: t('hero.featOSSBody') },
  ];

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
          {t('hero.banner')}
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.25em] sm:inline">
            {t('hero.tagline')}
          </span>
          <div className="inline-flex border-[2px] border-white overflow-hidden">
            {['ro', 'en'].map((loc) => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                className={`px-2 h-6 font-mono text-[9px] font-bold uppercase tracking-wider ${
                  locale === loc ? 'bg-white text-[var(--color-danger)]' : 'bg-[var(--color-danger)] text-white hover:bg-white/10'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-start px-6 pt-16 pb-24 sm:pt-24">
        {/* eyebrow */}
        <span className="mb-6 inline-flex items-center gap-2 border-[2.5px] border-black bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] shadow-[3px_3px_0_0_var(--color-line)]">
          <span className="h-2 w-2 animate-pulse bg-[var(--color-danger)]" />
          {t('hero.eyebrow')}
        </span>

        <h1 className="font-display text-[64px] leading-[0.92] font-black tracking-[-0.04em] sm:text-[96px] md:text-[120px]">
          {t('hero.title1')}
          <br />
          <span className="relative inline-block">
            <span className="relative z-10 text-white">{t('hero.title2')}</span>
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
          {t('hero.title3')}
        </h1>

        <p className="mt-10 max-w-xl text-lg font-medium text-[var(--color-fg-soft)] sm:text-xl">
          {t('hero.subtitle')}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button onClick={onStart} variant="primary" size="lg" className="text-sm">
            {t('hero.openEditor')}
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
          {features.map((f, i) => (
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
          <span>{t('hero.footerLeft')}</span>
          <span>{t('hero.footerRight')}</span>
        </div>
      </main>
    </div>
  );
}
