"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type SummaryResponse = {
  summary: {
    recipeCount: number;
    pantryItemCount: number;
    lowStockCount: number;
    shoppingItemCount: number;
    activeCookingSessionCount: number;
  };
  tonightCookView: {
    title: string;
    reason: string;
    missingIngredientCount: number;
  } | null;
};

export function FoodSummaryPanel() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      fetch("/api/food/dashboard", { credentials: "same-origin", cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json()) as SummaryResponse;
        })
        .then((body) => {
          setData(body);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    });
  }, []);

  if (!loaded || !data) return null;

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Food</div>
        <h2>Pantry, planning, and cooking</h2>
        <p className="muted mt-2">
          {data.tonightCookView?.reason ?? "Your household food hub is ready for pantry, recipes, shopping, and cooking sessions."}
        </p>
        <div className="pill-row mt-3">
          <span className="pill">{data.summary.recipeCount} recipes</span>
          <span className="pill">{data.summary.pantryItemCount} pantry items</span>
          <span className="pill">{data.summary.shoppingItemCount} shopping items</span>
          {data.summary.lowStockCount > 0 ? (
            <span className="pill reminder-overdue-pill">{data.summary.lowStockCount} low stock</span>
          ) : null}
          {data.summary.activeCookingSessionCount > 0 ? (
            <span className="pill">{data.summary.activeCookingSessionCount} active cooks</span>
          ) : null}
        </div>
        {data.tonightCookView ? (
          <p className="muted mt-3">
            Tonight: <strong>{data.tonightCookView.title}</strong>
            {data.tonightCookView.missingIngredientCount > 0
              ? ` with ${data.tonightCookView.missingIngredientCount} missing ingredient${data.tonightCookView.missingIngredientCount === 1 ? "" : "s"}`
              : " and pantry coverage looks strong"}
          </p>
        ) : null}
        <div className="action-row">
          <Link className="action-button" href="/app/food">
            Open food hub
          </Link>
        </div>
      </article>
    </section>
  );
}
