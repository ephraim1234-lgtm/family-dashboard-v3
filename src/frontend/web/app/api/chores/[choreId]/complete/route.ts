import { proxyApi } from "../../../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { choreId } = await params;
  const body = await req.text();
  return proxyApi(req, `/api/chores/${choreId}/complete`, {
    method: "POST",
    body: body || "{}"
  });
}
