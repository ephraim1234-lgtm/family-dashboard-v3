import { proxyApi } from "../../../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { choreId } = await params;
  const body = await req.text();
  return proxyApi(req, `/api/chores/${choreId}/assignee`, {
    method: "PATCH",
    body
  });
}
