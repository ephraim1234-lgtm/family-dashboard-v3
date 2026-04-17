import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../../lib/api-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params;
  return proxyApi(request, `/api/chores/instances/${instanceId}/complete`, {
    method: "POST"
  });
}
