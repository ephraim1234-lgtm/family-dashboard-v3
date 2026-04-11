import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await context.params;
  return proxyApi(request, `/api/integrations/google-calendar-links/${linkId}`, {
    method: "DELETE"
  });
}
