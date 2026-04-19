"use client";

import { useQuery } from "@tanstack/react-query";
import { foodClient } from "../../../lib/food-client";

export function useShoppingListDetail(shoppingListId: string | null) {
  return useQuery({
    queryKey: ["food", "shopping-list", shoppingListId],
    queryFn: () => foodClient.getShoppingList(shoppingListId!),
    enabled: Boolean(shoppingListId)
  });
}
