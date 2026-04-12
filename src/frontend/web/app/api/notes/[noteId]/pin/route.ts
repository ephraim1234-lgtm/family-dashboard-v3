import { proxyApi } from "../../../../../lib/api-proxy";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params;
  return proxyApi(req, `/api/notes/${noteId}/pin`, { method: "PATCH" });
}
