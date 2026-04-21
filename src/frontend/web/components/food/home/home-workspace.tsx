"use client";

import { useMemo, useState } from "react";
import { RecipeLibraryWorkspace } from "../recipes/recipe-library-workspace";
import { useFoodHubContext } from "../food-hub-context";

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function HomeStat({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "accent";
}) {
  const toneClassName = tone === "warning"
    ? "ui-inline-card-warning"
    : tone === "accent"
      ? "ui-inline-card-accent"
      : "ui-inline-card";

  return (
    <div className={`p-3 ${toneClassName}`}>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
      <div className="ui-text-muted mt-1 text-sm">{label}</div>
    </div>
  );
}

function HomeAttentionCard({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  tone = "default"
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  tone?: "default" | "warning" | "accent";
}) {
  const toneClassName = tone === "warning"
    ? "ui-inline-card-warning"
    : tone === "accent"
      ? "ui-inline-card-accent"
      : "ui-inline-card";

  return (
    <div className={`p-4 ${toneClassName}`}>
      <div className="eyebrow">{eyebrow}</div>
      <div className="mt-1 text-base font-semibold">{title}</div>
      <p className="ui-text-muted mt-2 text-sm">{description}</p>
      <button className="ui-button ui-button-ghost ui-button-sm mt-3" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

export function HomeWorkspace() {
  const {
    data,
    handleStartCooking,
    handleQuickCook,
    isPending,
    setError,
    startTransition,
    setActiveModuleTab,
    setPantryLowStockOnly,
    setRecipeWorkspaceTab,
    setImportReview,
    setRecipeDraft,
    setImportUrl,
    setShoppingMealFilterId
  } = useFoodHubContext();
  const [dismissedLowStock, setDismissedLowStock] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todaysMeals = useMemo(
    () => data.upcomingMeals.filter((slot: { date: string }) => slot.date === today),
    [data.upcomingMeals, today]
  );
  const nextUpcomingMeal = useMemo(
    () => data.upcomingMeals.find((slot: { date: string }) => slot.date > today) ?? null,
    [data.upcomingMeals, today]
  );
  const openShoppingCount = useMemo(
    () => data.shoppingList.items.filter((item: { state: string }) => item.state !== "Purchased" && item.state !== "Skipped").length,
    [data.shoppingList.items]
  );
  const needsReviewCount = useMemo(
    () => data.shoppingList.items.filter((item: { state: string }) => item.state === "NeedsReview").length,
    [data.shoppingList.items]
  );

  const firstCookingSession = data.activeCookingSessions[0] ?? null;
  const lowStockBanner = !dismissedLowStock && data.summary.lowStockCount > 0 ? (
    <article className="ui-alert ui-alert-warning">
      <div>
        <strong>{data.summary.lowStockCount} pantry items need attention soon.</strong>
        <div className="mt-1 text-sm opacity-80">Review low-stock staples before the next grocery run sneaks up on you.</div>
      </div>
      <div className="flex gap-2">
        <button
          className="ui-button ui-button-sm"
          type="button"
          onClick={() => {
            setPantryLowStockOnly(true);
            setActiveModuleTab("pantry");
          }}
        >
          Review pantry
        </button>
        <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={() => setDismissedLowStock(true)}>
          Dismiss
        </button>
      </div>
    </article>
  ) : null;

  function openRecipeLibrary() {
    setActiveModuleTab("recipes");
    setRecipeWorkspaceTab("library");
    setImportReview(null);
    setRecipeDraft(null);
  }

  function openRecipeImport() {
    setActiveModuleTab("recipes");
    setRecipeWorkspaceTab("capture");
    setImportUrl("");
    setImportReview(null);
    setRecipeDraft(null);
  }

  function openPantryView(lowStockOnly: boolean) {
    setPantryLowStockOnly(lowStockOnly);
    setActiveModuleTab("pantry");
  }

  function openShoppingView(mealSlotId: string | null = null) {
    setShoppingMealFilterId(mealSlotId);
    setActiveModuleTab("shopping");
  }

  function openMealsView() {
    setActiveModuleTab("planning");
  }

  return (
    <section className="grid gap-4" data-testid="food-home-workspace">
      {lowStockBanner}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <article className="panel overflow-hidden" data-testid="food-home-overview">
          <div className="eyebrow">Home</div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <h2>{todaysMeals.length > 0 ? "Keep food moving today" : "Get tonight lined up fast"}</h2>
              <p className="muted mt-2">
                {todaysMeals.length > 0
                  ? "See what is planned, spot any gaps, and jump straight into cooking or shopping."
                  : "Use Home as the quick-start board for planning dinner, checking pantry gaps, and finding a recipe everyone can agree on."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="ui-button ui-button-primary ui-button-sm" type="button" onClick={handleQuickCook}>
                Cook now
              </button>
              <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={openRecipeLibrary}>
                Browse recipes
              </button>
              <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={() => openShoppingView()}>
                Open shopping
              </button>
              <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={() => openPantryView(false)}>
                Review pantry
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HomeStat label="Recipes ready" value={data.summary.recipeCount} />
            <HomeStat label="Pantry items" value={data.summary.pantryItemCount} />
            <HomeStat label="Open shopping items" value={openShoppingCount} tone={openShoppingCount > 0 ? "accent" : "default"} />
            <HomeStat label="Low stock" value={data.summary.lowStockCount} tone={data.summary.lowStockCount > 0 ? "warning" : "default"} />
            <HomeStat label="Meals ahead" value={data.summary.upcomingMealCount} />
          </div>

          <div className="ui-inline-card mt-5">
            <div className="eyebrow">Tonight</div>
            <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {data.tonightCookView?.title ?? (todaysMeals[0]?.title ?? "No dinner planned yet")}
                </div>
                <p className="ui-text-muted mt-2 text-sm">
                  {data.tonightCookView?.reason ?? "Browse recipes, add one to the meal plan, and generate a shopping list without leaving Food."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.tonightCookView?.mealPlanSlotId ? (
                  <button
                    className="ui-button ui-button-primary ui-button-sm"
                    disabled={isPending}
                    type="button"
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleStartCooking({ mealPlanSlotId: data.tonightCookView.mealPlanSlotId }).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to start cooking.");
                        });
                      });
                    }}
                  >
                    Start tonight
                  </button>
                ) : (
                  <button className="ui-button ui-button-primary ui-button-sm" type="button" onClick={openRecipeLibrary}>
                    Pick a recipe
                  </button>
                )}
                {data.tonightCookView?.missingIngredientCount ? (
                  <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={() => openShoppingView(data.tonightCookView?.mealPlanSlotId ?? null)}>
                    {data.tonightCookView.missingIngredientCount} missing
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </article>

        <article className="panel" data-testid="food-home-attention">
          <div className="eyebrow">Needs attention</div>
          <h2>What to check next</h2>
          <p className="muted mt-2">The Home tab stays useful when it highlights the next thing worth doing, not every detail in the module.</p>

          <div className="mt-4 space-y-3">
            {data.summary.lowStockCount > 0 ? (
              <HomeAttentionCard
                eyebrow="Pantry"
                title={`${data.summary.lowStockCount} low-stock item${data.summary.lowStockCount === 1 ? "" : "s"}`}
                description="Review pantry staples and add the gaps to shopping before they become dinner blockers."
                actionLabel="Open low stock"
                onAction={() => openPantryView(true)}
                tone="warning"
              />
            ) : null}

            {needsReviewCount > 0 || openShoppingCount > 0 ? (
              <HomeAttentionCard
                eyebrow="Shopping"
                title={needsReviewCount > 0 ? `${needsReviewCount} item${needsReviewCount === 1 ? "" : "s"} need review` : `${openShoppingCount} item${openShoppingCount === 1 ? "" : "s"} still on the list`}
                description={needsReviewCount > 0
                  ? "A few shopping lines need a quick decision before the next trip."
                  : "Shopping is already in motion, so you can jump back in without hunting for the active list."}
                actionLabel="Open shopping"
                onAction={() => openShoppingView()}
                tone="accent"
              />
            ) : null}

            {firstCookingSession ? (
              <HomeAttentionCard
                eyebrow="Cooking now"
                title={firstCookingSession.title}
                description={`Progress ${Math.min(firstCookingSession.currentStepIndex + 1, Math.max(firstCookingSession.totalStepCount, 1))} of ${Math.max(firstCookingSession.totalStepCount, 1)} with ${firstCookingSession.checkedIngredientCount}/${firstCookingSession.totalIngredientCount} ingredients checked.`}
                actionLabel="Open session"
                onAction={() => {
                  window.location.href = `/app/food/cooking/${firstCookingSession.id}`;
                }}
                tone="accent"
              />
            ) : null}

            {todaysMeals.length === 0 && nextUpcomingMeal ? (
              <HomeAttentionCard
                eyebrow="Up next"
                title={nextUpcomingMeal.title}
                description={`${formatDateLabel(nextUpcomingMeal.date)} - ${nextUpcomingMeal.slotName}`}
                actionLabel="Open meals"
                onAction={openMealsView}
              />
            ) : null}

            {data.summary.lowStockCount === 0 && needsReviewCount === 0 && openShoppingCount === 0 && !firstCookingSession && (!nextUpcomingMeal || todaysMeals.length > 0) ? (
              <div className="ui-inline-card ui-text-muted text-sm">
                Everything looks calm right now. Use Home for quick starts, then jump into Recipes, Meals, Pantry, or Shopping when you need detail.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      {todaysMeals.length > 0 ? (
        <article className="panel" data-testid="food-home-today-section">
          <div className="eyebrow">Today</div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2>Meals ready to cook</h2>
              <p className="muted mt-2">Each meal card keeps the essentials visible: recipes, missing ingredients, and the fastest next action.</p>
            </div>
            <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={openMealsView}>
              Open meals
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {todaysMeals.map((slot: any) => (
              <div className="ui-inline-card" data-testid={`food-home-meal-${slot.id}`} key={slot.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="pill">{slot.slotName}</span>
                  <span className={`pill ${slot.shoppingOpenIngredientCount > 0 ? "ui-pill-warning" : ""}`}>
                    {slot.shoppingOpenIngredientCount > 0
                      ? `${slot.shoppingOpenIngredientCount} missing`
                      : "Pantry ready"}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold">{slot.title}</h3>
                <p className="ui-text-muted mt-2 text-sm">
                  {slot.shoppingOpenIngredientCount > 0
                    ? `${slot.shoppingOpenIngredientCount} of ${slot.shoppingTotalIngredientCount} shopping item${slot.shoppingTotalIngredientCount === 1 ? "" : "s"} still need attention.`
                    : "Ingredients are covered, so you can move straight into cooking mode."}
                </p>

                {slot.recipes.length > 0 ? (
                  <div className="pill-row mt-3">
                    {slot.recipes.map((recipe: any) => (
                      <span className="pill" key={recipe.id}>{recipe.title}</span>
                    ))}
                  </div>
                ) : null}

                {slot.notes ? <p className="ui-text-muted mt-3 text-sm">{slot.notes}</p> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="ui-button ui-button-primary ui-button-sm"
                    disabled={isPending}
                    type="button"
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleStartCooking({ mealPlanSlotId: slot.id }).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to start cooking.");
                        });
                      });
                    }}
                  >
                    Start cooking
                  </button>
                  <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={() => openShoppingView(slot.id)}>
                    {slot.shoppingOpenIngredientCount > 0 ? "Review shopping" : "Open shopping"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <article className="panel" data-testid="food-home-empty-state">
            <div className="eyebrow">Today</div>
            <h2>Nothing is planned for today</h2>
            <p className="muted mt-2">
              Pick a recipe, import something new, or head to Meals to plan ahead before the day gets busy.
            </p>

            {nextUpcomingMeal ? (
              <div className="ui-inline-card mt-4">
                <div className="eyebrow">Up next</div>
                <div className="mt-1 text-base font-semibold">{nextUpcomingMeal.title}</div>
                <p className="ui-text-muted mt-2 text-sm">
                  {formatDateLabel(nextUpcomingMeal.date)} - {nextUpcomingMeal.slotName}
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="ui-button ui-button-primary ui-button-sm" type="button" onClick={openRecipeLibrary}>
                Browse recipes
              </button>
              <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={openRecipeImport}>
                Import recipe
              </button>
              <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={openMealsView}>
                Open meals
              </button>
            </div>
          </article>

          <div className="panel" data-testid="food-home-recipes-preview">
            <div className="eyebrow">Recipe ideas</div>
            <h2>Find something everyone will actually eat</h2>
            <p className="muted mt-2">Search the shared library, then turn a good recipe into a meal plan or a quick cook session.</p>
            <div className="mt-4">
              <RecipeLibraryWorkspace hideHeader />
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
