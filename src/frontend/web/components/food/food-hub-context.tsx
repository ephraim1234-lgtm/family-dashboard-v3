"use client";

import { createContext, useContext, type ReactNode } from "react";

const FoodHubContext = createContext<unknown>(null);

export function FoodHubProvider<TValue>({
  value,
  children
}: Readonly<{ value: TValue; children: ReactNode }>) {
  return <FoodHubContext.Provider value={value}>{children}</FoodHubContext.Provider>;
}

export function useFoodHubContext<TValue = any>() {
  const context = useContext(FoodHubContext);
  if (!context) {
    throw new Error("FoodHubContext is not available.");
  }

  return context as TValue;
}
