import { NextRequest } from "next/server";

import { proxyApi } from "../../../../../lib/api-proxy";

export async function POST(request: NextRequest) {
  return proxyApi(request, "/api/integrations/google-oauth/start", {
    method: "POST"
  });
}
