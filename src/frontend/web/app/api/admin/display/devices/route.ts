import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

export async function GET(request: NextRequest) {
  return proxyApi(request, "/api/admin/display/devices");
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  return proxyApi(request, "/api/admin/display/devices", {
    method: "POST",
    body
  });
}
