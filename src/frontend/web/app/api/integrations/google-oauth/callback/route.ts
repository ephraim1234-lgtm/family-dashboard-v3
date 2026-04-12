import { NextRequest, NextResponse } from "next/server";

import { siteConfig } from "../../../../../lib/site-config";

export async function GET(request: NextRequest) {
  const targetUrl = new URL(
    `/api/integrations/google-oauth/callback${request.nextUrl.search}`,
    siteConfig.internalApiBaseUrl
  );

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? ""
    },
    cache: "no-store",
    redirect: "manual"
  });

  const nextResponse = new NextResponse(null, {
    status: response.status
  });

  const location = response.headers.get("location");
  if (location) {
    nextResponse.headers.set("location", location);
  }

  for (const cookie of response.headers.getSetCookie()) {
    nextResponse.headers.append("set-cookie", cookie);
  }

  return nextResponse;
}
