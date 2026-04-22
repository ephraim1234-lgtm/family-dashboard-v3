import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

type RouteContext = {
  params: Promise<{ inviteId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { inviteId } = await context.params;
  return proxyApi(request, `/api/households/invites/${inviteId}`, {
    method: "DELETE"
  });
}
