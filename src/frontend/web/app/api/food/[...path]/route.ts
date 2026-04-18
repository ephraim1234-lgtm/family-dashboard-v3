import { proxyApi } from "../../../../lib/api-proxy";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forward(
  req: NextRequest,
  context: RouteContext,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
) {
  const { path } = await context.params;
  const query = req.nextUrl.search;
  const targetPath = `/api/food/${path.join("/")}${query}`;
  const body =
    method === "GET" || method === "DELETE"
      ? undefined
      : await req.text();

  return proxyApi(req, targetPath, { method, body });
}

export async function GET(req: NextRequest, context: RouteContext) {
  return forward(req, context, "GET");
}

export async function POST(req: NextRequest, context: RouteContext) {
  return forward(req, context, "POST");
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return forward(req, context, "PATCH");
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return forward(req, context, "PUT");
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return forward(req, context, "DELETE");
}
