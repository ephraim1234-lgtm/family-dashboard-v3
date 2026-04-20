"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useWorkspaceQueryState<TWorkspace extends string>(
  allowedWorkspaces: readonly TWorkspace[],
  defaultWorkspace: TWorkspace
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedWorkspace = searchParams.get("workspace");
  const workspace = allowedWorkspaces.includes(requestedWorkspace as TWorkspace)
    ? (requestedWorkspace as TWorkspace)
    : defaultWorkspace;

  function setWorkspace(nextWorkspace: TWorkspace) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("workspace", nextWorkspace);
    const nextQuery = nextSearchParams.toString();

    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false
    });
  }

  return {
    workspace,
    setWorkspace
  };
}
