import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  const { reminderId } = await params;
  return proxyApi(request, `/api/notifications/reminders/${reminderId}`, {
    method: "DELETE"
  });
}
