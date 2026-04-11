import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  return proxyApi(request, `/api/display/projection/${token}`, {
    includeCookies: false
  });
}
