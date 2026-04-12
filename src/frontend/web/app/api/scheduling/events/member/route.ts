import { proxyApi } from "../../../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  return proxyApi(req, "/api/scheduling/events/member", { method: "POST", body });
}
