import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../../lib/api-proxy";

export async function POST(request: NextRequest) {
  const body = await request.text();

  return proxyApi(request, "/api/integrations/google-oauth/calendars/link", {
    method: "POST",
    body
  });
}
