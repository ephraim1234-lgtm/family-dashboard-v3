"use client";

import { useEffect, useState } from "react";

type TvCookingDisplayData = {
  sessionId: string;
  title: string;
  currentStepIndex: number;
  totalStepCount: number;
  currentStepInstruction: string | null;
  nextStepInstruction: string | null;
  remainingIngredients: string[];
  completedIngredients: string[];
  remainingSteps: string[];
};

export function TvCookingDisplay({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<TvCookingDisplayData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/food/cooking-sessions/${sessionId}/tv`, {
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`Unable to load TV cooking view: ${response.status}`);
        }
        const body = (await response.json()) as TvCookingDisplayData;
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load TV cooking mode.");
        }
      }
    }

    load().catch(() => undefined);
    const interval = setInterval(() => {
      load().catch(() => undefined);
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  if (!data) {
    return (
      <main className="food-tv-shell">
        <div className="food-tv-frame">
          <p className="muted">{error ?? "Loading TV cooking mode..."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="food-tv-shell">
      <div className="food-tv-frame">
        <div className="display-kicker">
          <span>Cooking mode</span>
          <span>Step {data.currentStepIndex + 1}/{data.totalStepCount}</span>
        </div>
        <h1 className="food-tv-title">{data.title}</h1>

        <section className="food-tv-grid">
          <article className="food-tv-card">
            <div className="eyebrow">Current step</div>
            <div className="food-tv-step">{data.currentStepInstruction ?? "Start the cook from mobile."}</div>
            {data.nextStepInstruction ? (
              <p className="display-lede">Next: {data.nextStepInstruction}</p>
            ) : null}
          </article>

          <article className="food-tv-card">
            <div className="eyebrow">Ingredients left</div>
            <div className="food-tv-list">
              {data.remainingIngredients.length > 0 ? (
                data.remainingIngredients.map((item) => <div key={item}>{item}</div>)
              ) : (
                <div>All ingredients checked off.</div>
              )}
            </div>
          </article>
        </section>

        <section className="food-tv-grid">
          <article className="food-tv-card">
            <div className="eyebrow">Done</div>
            <div className="food-tv-list">
              {data.completedIngredients.length > 0 ? (
                data.completedIngredients.map((item) => <div key={item}>{item}</div>)
              ) : (
                <div>No ingredients confirmed yet.</div>
              )}
            </div>
          </article>

          <article className="food-tv-card">
            <div className="eyebrow">Coming up</div>
            <div className="food-tv-list">
              {data.remainingSteps.slice(0, 4).map((item, index) => (
                <div key={`${index}-${item}`}>{item}</div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
