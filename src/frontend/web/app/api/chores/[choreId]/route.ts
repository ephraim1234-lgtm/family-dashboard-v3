import { proxyApi } from "../../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { choreId } = await params;
  const body = await req.text();
  return proxyApi(req, `/api/chores/${choreId}`, { method: "PUT", body });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { choreId } = await params;
  return proxyApi(req, `/api/chores/${choreId}`, { method: "DELETE" });
}
