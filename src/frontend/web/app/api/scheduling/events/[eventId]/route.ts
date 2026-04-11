import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../lib/api-proxy";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;
  const body = await request.text();

  return proxyApi(request, `/api/scheduling/events/${eventId}`, {
    method: "PUT",
    body
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params;

  return proxyApi(request, `/api/scheduling/events/${eventId}`, {
    method: "DELETE"
  });
}
