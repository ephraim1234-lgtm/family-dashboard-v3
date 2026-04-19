"use client";

import { createContext, useContext } from "react";

const FoodHubContext = createContext<any>(null);

export function FoodHubProvider({
  value,
  children
}: Readonly<{ value: any; children: React.ReactNode }>) {
  return <FoodHubContext.Provider value={value}>{children}</FoodHubContext.Provider>;
}

export function useFoodHubContext<T = any>() {
  const context = useContext(FoodHubContext);
  if (!context) {
    throw new Error("FoodHubContext is not available.");
  }

  return context as T;
}
