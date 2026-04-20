"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge, Card } from "@/components/ui";

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
    <Card className="space-y-4">
      <div className="eyebrow">Food</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Pantry, planning, and cooking</h2>
        <p className="muted">
          {data.tonightCookView?.reason ?? "Your household food hub is ready for pantry, recipes, shopping, and cooking sessions."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{data.summary.recipeCount} recipes</Badge>
        <Badge>{data.summary.pantryItemCount} pantry items</Badge>
        <Badge>{data.summary.shoppingItemCount} shopping items</Badge>
        {data.summary.lowStockCount > 0 ? (
          <Badge variant="warning">{data.summary.lowStockCount} low stock</Badge>
        ) : null}
        {data.summary.activeCookingSessionCount > 0 ? (
          <Badge>{data.summary.activeCookingSessionCount} active cooks</Badge>
        ) : null}
      </div>

      {data.tonightCookView ? (
        <p className="muted">
          Tonight: <strong>{data.tonightCookView.title}</strong>
          {data.tonightCookView.missingIngredientCount > 0
            ? ` with ${data.tonightCookView.missingIngredientCount} missing ingredient${data.tonightCookView.missingIngredientCount === 1 ? "" : "s"}`
            : " and pantry coverage looks strong"}
        </p>
      ) : null}

      <div>
        <Link className="btn btn-primary min-h-[48px] rounded-full px-5" href="/app/food">
          Open food hub
        </Link>
      </div>
    </Card>
  );
}
