import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const { membershipId } = await params;
  return proxyApi(request, `/api/households/members/${membershipId}`, {
    method: "DELETE"
  });
}
