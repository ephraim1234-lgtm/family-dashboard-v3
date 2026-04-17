import { NextRequest } from "next/server";
import { proxyApi } from "../../../../lib/api-proxy";

export async function GET(request: NextRequest) {
  const windowDays = request.nextUrl.searchParams.get("windowDays") ?? "14";
  return proxyApi(request, `/api/chores/instances?windowDays=${windowDays}`);
}
