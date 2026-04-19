"use client";

import { useQuery } from "@tanstack/react-query";
import { foodClient } from "../../../lib/food-client";

export function useFoodRecipeLibrary(query: string) {
  return useQuery({
    queryKey: ["food", "recipes", query],
    queryFn: () => foodClient.listRecipes(query)
  });
}

export function useFoodRecipeDetail(recipeId: string | null) {
  return useQuery({
    queryKey: ["food", "recipe", recipeId],
    queryFn: () => foodClient.getRecipe(recipeId!),
    enabled: Boolean(recipeId)
  });
}
