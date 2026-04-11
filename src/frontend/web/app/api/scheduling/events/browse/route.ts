import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.search;
  return proxyApi(request, `/api/scheduling/events/browse${query}`);
}
