import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

export async function GET(request: NextRequest) {
  return proxyApi(request, "/api/scheduling/events/series");
}
