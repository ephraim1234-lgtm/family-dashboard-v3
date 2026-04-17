import { NextRequest } from "next/server";
import { proxyApi } from "../../../../lib/api-proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { choreId } = await params;
  const body = await request.text();
  return proxyApi(request, `/api/chores/${choreId}`, { method: "PUT", body });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { choreId } = await params;
  return proxyApi(request, `/api/chores/${choreId}`, { method: "DELETE" });
}
