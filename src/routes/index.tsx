import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Minus, RefreshCw, ShieldX } from "lucide-react";

import {
  analyse,
  buildQuote,
  formatPrice,
  PAIRS,
  PIPELINE_STEPS,
  WHITELIST,
  type Analysis,
  type MacroEvent,
  type PairId,
  type Timeframe,
} from "@/lib/macro";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Macro Desk — pipeline fondamental AUD/CAD & BTC/USD" },
      {
        name: "description",
        content:
          "Analyse fondamentale en 8 étapes sur AUD/CAD et BTC/USD : sources validées, importance, interactions, biais macro et score de confiance.",
      },
      { property: "og:title", content: "Macro Desk — pipeline fondamental AUD/CAD & BTC/USD" },
      {
        property: "og:description",
        content: "Sources validées uniquement, biais macro et niveau de confiance 0–100.",
      },
    ],
  }),
  component: Index,
});

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "h1", label: "H1" },
  { id: "news", label: "News" },
];

const TABS = ["Pipeline", "Événements", "Rapport"] as const;

function Index() {
  const [pair, setPair] = useState<PairId>("BTCUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pipeline");
  const [seed, setSeed] = useState(7);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);

  const quote = useMemo(() => buildQuote(pair, seed), [pair, seed]);

  const reset = useCallback(() => {
    setAnalysis(null);
    setStep(0);
    setRunning(false);
  }, []);

  useEffect(() => {
    reset();
  }, [pair, reset]);

  useEffect(() => {
    if (!running) return;
    if (step >= PIPELINE_STEPS.length) {
      setRunning(false);
      setAnalysis(analyse(pair, quote));
      setTab("Rapport");
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), 320);
    return () => clearTimeout(id);
  }, [running, step, pair, quote]);

  const events = analysis?.events ?? [];
  const shown = events.filter((e) => e.timeframe === timeframe);
  const up = quote.changePct >= 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Pipeline 8 étapes</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Macro Desk</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Analyse fondamentale temps réel — sources validées uniquement.
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1 font-mono text-xs">
          {(Object.keys(PAIRS) as PairId[]).map((p) => (
            <button
              key={p}
              onClick={() => setPair(p)}
              className={`rounded px-3 py-2 transition-colors ${
                pair === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PAIRS[p].label}
            </button>
          ))}
        </div>
      </header>

      <section className="panel tape-glow mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {PAIRS[pair].label} · {PAIRS[pair].sub}
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">
              {formatPrice(pair, quote.price)}
            </p>
            <p
              className={`mt-1 flex items-center gap-1 font-mono text-sm ${up ? "text-bull" : "text-bear"}`}
            >
              {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {up ? "+" : ""}
              {quote.changePct.toFixed(2)}%
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-1 rounded-md border border-border bg-background p-1 font-mono text-xs">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id)}
                  className={`rounded px-3 py-1.5 transition-colors ${
                    timeframe === t.id
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setSeed((s) => s + 1);
                reset();
              }}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <RefreshCw className="size-3.5" /> Actualiser
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 font-mono text-xs">
          <div>
            <span className="text-muted-foreground">bas</span>
            <p className="mt-1 tabular-nums">{formatPrice(pair, quote.low)}</p>
          </div>
          <div className="text-center text-muted-foreground">
            {analysis?.validated.length ?? 0} événements validés · {analysis?.strong.length ?? 0} fortes
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">haut</span>
            <p className="mt-1 tabular-nums">{formatPrice(pair, quote.high)}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setAnalysis(null);
            setStep(0);
            setRunning(true);
            setTab("Pipeline");
          }}
          disabled={running}
          className="mt-5 w-full rounded-md bg-primary px-4 py-3 font-mono text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {running ? `Analyse… étape ${Math.min(step + 1, 8)}/8` : "Lancer l'analyse fondamentale"}
        </button>
      </section>

      <nav className="mt-6 flex gap-6 border-b border-border font-mono text-sm">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-3 transition-colors ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Pipeline" && (
        <ol className="mt-5 space-y-2">
          {PIPELINE_STEPS.map((s) => {
            const done = analysis !== null || step > s.n - 1;
            const active = running && step === s.n - 1;
            return (
              <li
                key={s.n}
                className={`panel flex items-center gap-4 p-4 transition-colors ${
                  active ? "border-primary" : ""
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded font-mono text-sm ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-4" /> : s.n}
                </span>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {tab === "Événements" && (
        <div className="mt-5 space-y-3">
          {shown.length === 0 && (
            <p className="panel p-6 text-center text-sm text-muted-foreground">
              Aucun événement sur ce flux — lancez l'analyse ou changez de vue ({timeframe}).
            </p>
          )}
          {shown.map((e) => (
            <EventCard key={e.id} event={e} pair={pair} />
          ))}
          <div className="panel p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Liste blanche des sources
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {WHITELIST.map((s) => (
                <span key={s} className="rounded border border-border px-2 py-1 font-mono text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Rapport" && (
        <div className="mt-5 space-y-4">
          {!analysis ? (
            <p className="panel p-6 text-center text-sm text-muted-foreground">
              Le rapport apparaît après l'exécution du pipeline.
            </p>
          ) : (
            <>
              <div className="panel p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Biais macro
                </p>
                <p
                  className={`mt-2 font-mono text-3xl font-semibold capitalize ${
                    analysis.bias === "haussier"
                      ? "text-bull"
                      : analysis.bias === "baissier"
                        ? "text-bear"
                        : "text-neutral"
                  }`}
                >
                  {analysis.bias}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{analysis.regime}</p>
              </div>

              <div className="panel p-5">
                <div className="flex items-baseline justify-between font-mono">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Niveau de confiance
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">{analysis.confidence}/100</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${analysis.confidence}%` }}
                  />
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {analysis.justification.map((j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-primary">·</span>
                      {j}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel p-5">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Interactions
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {analysis.interactions.map((i) => (
                    <li key={i} className="text-muted-foreground">
                      {i}
                    </li>
                  ))}
                </ul>
              </div>

              {analysis.rejected.length > 0 && (
                <div className="panel p-5">
                  <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    <ShieldX className="size-4 text-bear" /> Sources écartées
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {analysis.rejected.map((e) => (
                      <li key={e.id}>
                        <span className="line-through">{e.title}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{e.source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}

function EventCard({ event, pair }: { event: MacroEvent; pair: PairId }) {
  const dirIcon =
    event.direction === "haussier" ? (
      <ArrowUpRight className="size-4 text-bull" />
    ) : event.direction === "baissier" ? (
      <ArrowDownRight className="size-4 text-bear" />
    ) : (
      <Minus className="size-4 text-neutral" />
    );

  return (
    <article className={`panel p-4 ${event.whitelisted ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{event.title}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {event.source} · {event.category} · {pair}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirIcon}
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${
              event.importance === "forte"
                ? "border-primary text-primary"
                : event.importance === "moyenne"
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground"
            }`}
          >
            {event.importance}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{event.detail}</p>
      {!event.whitelisted && (
        <p className="mt-2 flex items-center gap-1 font-mono text-xs text-bear">
          <ShieldX className="size-3.5" /> écarté — hors liste blanche
        </p>
      )}
    </article>
  );
}
