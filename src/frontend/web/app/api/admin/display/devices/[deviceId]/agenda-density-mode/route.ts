import { NextRequest } from "next/server";
import { proxyApi } from "../../../../../../../lib/api-proxy";

type RouteContext = {
  params: Promise<{ deviceId: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { deviceId } = await context.params;
  const body = await request.text();

  return proxyApi(
    request,
    `/api/admin/display/devices/${deviceId}/agenda-density-mode`,
    {
      method: "PUT",
      body
    }
  );
}
