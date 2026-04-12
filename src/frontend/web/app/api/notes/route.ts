import { proxyApi } from "../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return proxyApi(req, "/api/notes");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return proxyApi(req, "/api/notes", { method: "POST", body });
}
