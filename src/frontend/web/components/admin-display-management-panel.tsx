"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ActionButton,
  Badge,
  Card,
  ListCard,
  QuickActions,
  SectionHeader
} from "@/components/ui";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type DisplayDeviceSummary = {
  deviceId: string;
  deviceName: string;
  isActive: boolean;
  presentationMode: "Balanced" | "FocusNext";
  agendaDensityMode: "Comfortable" | "Dense";
  accessTokenHint: string;
  createdAtUtc: string;
};

type DisplayDeviceListState = {
  devices: DisplayDeviceSummary[];
};

type CreateDisplayDeviceState = {
  deviceId: string;
  deviceName: string;
  presentationMode: "Balanced" | "FocusNext";
  agendaDensityMode: "Comfortable" | "Dense";
  accessToken: string;
  accessTokenHint: string;
  displayPath: string;
  createdAtUtc: string;
} | null;

const SAVED_PATHS_KEY = "householdops:display-paths";

function loadSavedPaths(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SAVED_PATHS_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function savePath(deviceId: string, displayPath: string) {
  if (typeof window === "undefined") return;
  const existing = loadSavedPaths();
  window.localStorage.setItem(SAVED_PATHS_KEY, JSON.stringify({ ...existing, [deviceId]: displayPath }));
}

export function AdminDisplayManagementPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [devices, setDevices] = useState<DisplayDeviceSummary[]>([]);
  const [savedPaths, setSavedPaths] = useState<Record<string, string>>({});
  const [latestCreated, setLatestCreated] = useState<CreateDisplayDeviceState>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSavedPaths(loadSavedPaths());
  }, []);

  async function updatePresentationMode(
    deviceId: string,
    presentationMode: "Balanced" | "FocusNext"
  ) {
    setError(null);

    const response = await fetch(
      `/api/admin/display/devices/${deviceId}/presentation-mode`,
      {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ presentationMode })
      }
    );

    if (!response.ok) {
      setError(`Display mode update failed with ${response.status}.`);
      return;
    }

    await refresh();
  }

  async function updateAgendaDensityMode(
    deviceId: string,
    agendaDensityMode: "Comfortable" | "Dense"
  ) {
    setError(null);

    const response = await fetch(
      `/api/admin/display/devices/${deviceId}/agenda-density-mode`,
      {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ agendaDensityMode })
      }
    );

    if (!response.ok) {
      setError(`Display agenda density update failed with ${response.status}.`);
      return;
    }

    await refresh();
  }

  async function refresh() {
    setError(null);

    const response = await fetch("/api/admin/display/devices", {
      credentials: "same-origin",
      cache: "no-store"
    });

    setStatus(response.status);

    if (!response.ok) {
      setDevices([]);

      if (response.status === 401 || response.status === 403) {
        return;
      }

      setError(`Display device lookup failed with ${response.status}.`);
      return;
    }

    const data = (await response.json()) as DisplayDeviceListState;
    setDevices(data.devices);
  }

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }

    if (!isOwner) {
      setDevices([]);
      setLatestCreated(null);
      setStatus(401);
      setError(null);
      return;
    }

    startTransition(() => {
      refresh().catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load display devices."
        );
      });
    });
  }, [isOwner, isSessionLoading]);

  function handleRefresh() {
    startTransition(() => {
      refresh().catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load display devices."
        );
      });
    });
  }

  function createDevice() {
    startTransition(() => {
      createDeviceRequest().catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to create a display device."
        );
      });
    });
  }

  async function createDeviceRequest() {
    setError(null);

    const response = await fetch("/api/admin/display/devices", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });

    setStatus(response.status);

    if (!response.ok) {
      setLatestCreated(null);
      setError(`Display device creation failed with ${response.status}.`);
      return;
    }

    const created = (await response.json()) as CreateDisplayDeviceState;
    setLatestCreated(created);
    if (created) {
      savePath(created.deviceId, created.displayPath);
      setSavedPaths(loadSavedPaths());
    }
    await refresh();
  }

  return (
    <section className="grid gap-4">
      <Card className="space-y-4 ui-card-admin">
        <SectionHeader
          eyebrow="Display management"
          title="Owner-managed devices"
          description="Display artifacts are provisioned here, then accessed later through separate display tokens."
        />

        <QuickActions label="Provisioning actions">
          <ActionButton onClick={createDevice} disabled={isPending}>
            Provision display device
          </ActionButton>
          <ActionButton variant="ghost" onClick={handleRefresh} disabled={isPending}>
            Refresh devices
          </ActionButton>
        </QuickActions>

        {error ? <p className="error-text">{error}</p> : null}

        {latestCreated ? (
          <div className="grid gap-3 md:grid-cols-2">
            <ListCard title="Latest device" description={latestCreated.deviceName} tone="admin" />
            <ListCard title="Presentation mode" description={latestCreated.presentationMode} tone="admin" />
            <ListCard title="Agenda density" description={latestCreated.agendaDensityMode} tone="admin" />
            <ListCard title="Access token" description={latestCreated.accessToken} tone="admin" />
            <ListCard
              title="Display path"
              description={
                <Link href={latestCreated.displayPath}>
                  {latestCreated.displayPath}
                </Link>
              }
              tone="admin"
            />
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 ui-card-admin">
        <SectionHeader
          eyebrow="Provisioned devices"
          title="Adjust the display feel per device"
          description="Balanced keeps a fuller agenda visible, Focus Next emphasizes the next timed item, and density stays separate."
        />

        {status === 200 ? (
          devices.length > 0 ? (
            <div className="grid gap-3">
              {devices.map((device) => (
                <ListCard
                  key={device.deviceId}
                  title={device.deviceName}
                  description={`Token hint ${device.accessTokenHint} - ${device.isActive ? "active" : "inactive"}`}
                  meta={`Created ${new Date(device.createdAtUtc).toLocaleDateString()}`}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="admin">{device.presentationMode}</Badge>
                      <Badge variant="admin">{device.agendaDensityMode}</Badge>
                      {savedPaths[device.deviceId] ? (
                        <Link
                          href={savedPaths[device.deviceId]}
                          className="pill pill-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open display
                        </Link>
                      ) : (
                        <Badge>URL not saved</Badge>
                      )}
                    </div>
                  }
                  tone="admin"
                >
                  <QuickActions label="Display options">
                    <ActionButton
                      size="sm"
                      variant={device.presentationMode === "Balanced" ? "active" : "ghost"}
                      onClick={() =>
                        startTransition(() => {
                          updatePresentationMode(device.deviceId, "Balanced").catch(
                            (updateError: unknown) => {
                              setError(
                                updateError instanceof Error
                                  ? updateError.message
                                  : "Unable to update the display mode."
                              );
                            }
                          );
                        })
                      }
                      disabled={isPending}
                    >
                      Balanced
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant={device.presentationMode === "FocusNext" ? "active" : "ghost"}
                      onClick={() =>
                        startTransition(() => {
                          updatePresentationMode(device.deviceId, "FocusNext").catch(
                            (updateError: unknown) => {
                              setError(
                                updateError instanceof Error
                                  ? updateError.message
                                  : "Unable to update the display mode."
                              );
                            }
                          );
                        })
                      }
                      disabled={isPending}
                    >
                      Focus next
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant={device.agendaDensityMode === "Comfortable" ? "active" : "ghost"}
                      onClick={() =>
                        startTransition(() => {
                          updateAgendaDensityMode(device.deviceId, "Comfortable").catch(
                            (updateError: unknown) => {
                              setError(
                                updateError instanceof Error
                                  ? updateError.message
                                  : "Unable to update display density."
                              );
                            }
                          );
                        })
                      }
                      disabled={isPending}
                    >
                      Comfortable
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant={device.agendaDensityMode === "Dense" ? "active" : "ghost"}
                      onClick={() =>
                        startTransition(() => {
                          updateAgendaDensityMode(device.deviceId, "Dense").catch(
                            (updateError: unknown) => {
                              setError(
                                updateError instanceof Error
                                  ? updateError.message
                                  : "Unable to update display density."
                              );
                            }
                          );
                        })
                      }
                      disabled={isPending}
                    >
                      Dense
                    </ActionButton>
                  </QuickActions>
                </ListCard>
              ))}
            </div>
          ) : (
            <p className="muted">
              No display devices have been provisioned for this household yet.
            </p>
          )
        ) : status === 401 ? (
          <p className="muted">
            Sign in with an owner session to manage display devices.
          </p>
        ) : status === 403 ? (
          <p className="muted">
            The current session is authenticated but not allowed to manage display devices.
          </p>
        ) : (
          <p className="muted">Loading display devices...</p>
        )}
      </Card>
    </section>
  );
}
