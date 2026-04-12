import { proxyApi } from "../../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;
  return proxyApi(req, `/api/notes/${noteId}`, { method: "DELETE" });
}
