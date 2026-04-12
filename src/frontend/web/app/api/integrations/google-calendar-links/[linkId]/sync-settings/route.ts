import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../../lib/api-proxy";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await context.params;
  const body = await request.text();

  return proxyApi(request, `/api/integrations/google-calendar-links/${linkId}/sync-settings`, {
    method: "PUT",
    body
  });
}
