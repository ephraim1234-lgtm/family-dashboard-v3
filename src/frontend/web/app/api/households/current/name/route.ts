import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

export async function PATCH(request: NextRequest) {
  const body = await request.text();
  return proxyApi(request, "/api/households/current/name", {
    method: "PATCH",
    body
  });
}
