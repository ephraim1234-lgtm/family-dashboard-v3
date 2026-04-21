"use client";

import { useFoodHubContext } from "../food-hub-context";
import { RecipeCaptureWorkspace } from "./recipe-capture-workspace";
import { RecipeDetailPanel } from "./recipe-detail-panel";
import { RecipeLibraryWorkspace } from "./recipe-library-workspace";
import { ActionButton, PageHeader, PageContainer } from "@/components/ui";

export function RecipesWorkspace() {
  const {
    recipeWorkspaceTab,
    setRecipeWorkspaceTab,
    setImportReview,
    setRecipeDraft,
    setImportUrl
  } = useFoodHubContext();

  return (
    <PageContainer>
      <PageHeader
        actions={
          <>
            <ActionButton
              size="sm"
              variant={recipeWorkspaceTab === "library" ? "active" : "ghost"}
              onClick={() => setRecipeWorkspaceTab("library")}
            >
              Library
            </ActionButton>
            <ActionButton
              size="sm"
              variant={recipeWorkspaceTab === "detail" ? "active" : "ghost"}
              onClick={() => setRecipeWorkspaceTab("detail")}
            >
              Detail
            </ActionButton>
            <ActionButton
              size="sm"
              variant={recipeWorkspaceTab === "capture" ? "active" : "primary"}
              onClick={() => {
                setRecipeWorkspaceTab("capture");
                setImportUrl("");
                setImportReview(null);
                setRecipeDraft(null);
              }}
            >
              Import Recipe
            </ActionButton>
          </>
        }
        eyebrow="Recipe workspace"
        title="Capture, browse, and maintain household recipes"
      />

      <section className={`grid ${recipeWorkspaceTab === "capture" ? "" : "food-section-grid"}`}>
        {recipeWorkspaceTab === "capture" ? <RecipeCaptureWorkspace /> : null}
        {recipeWorkspaceTab !== "capture" ? <RecipeLibraryWorkspace /> : null}
        {recipeWorkspaceTab !== "capture" ? <RecipeDetailPanel /> : null}
      </section>
    </PageContainer>
  );
}
