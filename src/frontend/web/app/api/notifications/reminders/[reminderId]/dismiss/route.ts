import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../../lib/api-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  const { reminderId } = await params;
  return proxyApi(request, `/api/notifications/reminders/${reminderId}/dismiss`, {
    method: "POST"
  });
}
