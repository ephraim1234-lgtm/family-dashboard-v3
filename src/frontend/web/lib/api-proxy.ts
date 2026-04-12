import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "./site-config";

type ProxyOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  includeCookies?: boolean;
  body?: string;
};

export async function proxyApi(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {}
) {
  const response = await fetch(`${siteConfig.internalApiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers: options.includeCookies == false
      ? options.body
        ? {
            "content-type": request.headers.get("content-type") ?? "application/json"
          }
        : undefined
      : {
          cookie: request.headers.get("cookie") ?? "",
          ...(options.body
            ? {
                "content-type":
                  request.headers.get("content-type") ?? "application/json"
              }
            : {})
        },
    cache: "no-store",
    redirect: "manual"
  });

  const body = await response.text();
  const nextResponse =
    response.status === 204
      ? new NextResponse(null, { status: response.status })
      : new NextResponse(body, {
          status: response.status,
          headers: {
            "content-type":
              response.headers.get("content-type") ?? "application/json"
          }
        });

  for (const cookie of response.headers.getSetCookie()) {
    nextResponse.headers.append("set-cookie", cookie);
  }

  return nextResponse;
}
