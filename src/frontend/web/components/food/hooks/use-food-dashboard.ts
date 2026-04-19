"use client";

import { useQuery } from "@tanstack/react-query";
import { foodClient } from "../../../lib/food-client";

export function useFoodDashboard() {
  return useQuery({
    queryKey: ["food", "dashboard"],
    queryFn: () => foodClient.getDashboard()
  });
}
