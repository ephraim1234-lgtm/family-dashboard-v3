import { proxyApi } from "../../../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return proxyApi(req, "/api/chores/completions/recent", { method: "GET" });
}
