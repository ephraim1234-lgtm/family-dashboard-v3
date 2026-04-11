export const siteConfig = {
  productName: "HouseholdOps",
  publicApiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
  internalApiBaseUrl:
    process.env.API_INTERNAL_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3001"
};
