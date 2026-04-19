"use client";

import { FoodShoppingList } from "../../../lib/food-client";

type ShoppingTripDetailProps = {
  trip: FoodShoppingList | null | undefined;
  loading: boolean;
  onClose: () => void;
};

export function ShoppingTripDetail({ trip, loading, onClose }: ShoppingTripDetailProps) {
  if (!trip && !loading) {
    return null;
  }

  return (
    <div className="stack-card" style={{ marginTop: "14px" }}>
      <div className="stack-card-header">
        <div>
          <strong>{trip?.name ?? "Trip detail"}</strong>
          <div className="muted">{loading ? "Loading trip history..." : trip?.status}</div>
        </div>
        <button className="pill-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {trip ? (
        <div className="stack-list" style={{ marginTop: "12px" }}>
          {trip.items.map((item) => (
            <div className="stack-card" key={item.id}>
              <div className="stack-card-header">
                <strong>{item.ingredientName}</strong>
                <span className="pill">{item.state}</span>
              </div>
              <div className="muted">
                {(item.quantityPurchased ?? item.quantityNeeded) ?? "?"} {item.unit ?? ""}
              </div>
              {item.sourceMealTitles || item.sourceRecipeTitle ? (
                <div className="muted">{item.sourceMealTitles ?? item.sourceRecipeTitle}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
