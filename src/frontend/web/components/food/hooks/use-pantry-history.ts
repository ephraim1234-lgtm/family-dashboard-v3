"use client";

import { useQuery } from "@tanstack/react-query";
import { foodClient } from "../../../lib/food-client";

export function usePantryHistory(pantryItemId: string | null) {
  return useQuery({
    queryKey: ["food", "pantry-history", pantryItemId],
    queryFn: () => foodClient.getPantryHistory(pantryItemId!),
    enabled: Boolean(pantryItemId)
  });
}
