"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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
  const [latestCreated, setLatestCreated] =
    useState<CreateDisplayDeviceState>(null);
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
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Display Management</div>
        <h2>Owner-managed devices</h2>
        <p className="muted">
          Display artifacts are created through the owner-gated admin surface,
          then accessed later through separate display tokens.
        </p>

        <div className="action-row">
          <button
            className="action-button"
            onClick={createDevice}
            disabled={isPending}
          >
            Provision Display Device
          </button>
          <button
            className="action-button action-button-ghost"
            onClick={handleRefresh}
            disabled={isPending}
          >
            Refresh Devices
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {latestCreated ? (
          <>
            <div className="section-spacer" />
            <dl className="data-list">
              <div>
                <dt>Latest device</dt>
                <dd>{latestCreated.deviceName}</dd>
              </div>
              <div>
                <dt>Presentation mode</dt>
                <dd>{latestCreated.presentationMode}</dd>
              </div>
              <div>
                <dt>Agenda density</dt>
                <dd>{latestCreated.agendaDensityMode}</dd>
              </div>
              <div>
                <dt>Access token</dt>
                <dd>{latestCreated.accessToken}</dd>
              </div>
              <div>
                <dt>Display path</dt>
                <dd>
                  <Link href={latestCreated.displayPath}>
                    {latestCreated.displayPath}
                  </Link>
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </article>

      <article className="panel">
        <h2>Provisioned devices</h2>
        <p className="muted">
          Use one explicit presentation mode per device. Balanced keeps a fuller
          agenda list visible; FocusNext puts more weight on the next timed item.
        </p>
        <p className="muted">
          Agenda density stays separate and bounded. Comfortable keeps more space
          around items; Dense surfaces more of the same projection frame.
        </p>
        {status === 200 ? (
          devices.length > 0 ? (
            <div className="stack-list">
              {devices.map((device) => (
                <div className="stack-card" key={device.deviceId}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{device.deviceName}</strong>
                      <div className="muted">
                        Token hint {device.accessTokenHint} |{" "}
                        {device.isActive ? "active" : "inactive"}
                      </div>
                    </div>
                    <div className="pill-row">
                      <span className="pill">{device.presentationMode}</span>
                      <span className="pill">{device.agendaDensityMode}</span>
                      {savedPaths[device.deviceId] ? (
                        <Link
                          href={savedPaths[device.deviceId]}
                          className="pill pill-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open Display ↗
                        </Link>
                      ) : (
                        <span className="pill muted" title="Reprovision this device to get a saved URL">
                          URL not saved
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pill-row">
                    <button
                      className={`pill-button ${device.presentationMode === "Balanced" ? "pill-button-active" : ""}`}
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
                    </button>
                    <button
                      className={`pill-button ${device.presentationMode === "FocusNext" ? "pill-button-active" : ""}`}
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
                      Focus Next
                    </button>
                    <button
                      className={`pill-button ${device.agendaDensityMode === "Comfortable" ? "pill-button-active" : ""}`}
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
                    </button>
                    <button
                      className={`pill-button ${device.agendaDensityMode === "Dense" ? "pill-button-active" : ""}`}
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
                    </button>
                  </div>
                </div>
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
            The current session is authenticated but not allowed to manage
            display devices.
          </p>
        ) : (
          <p className="muted">Loading display devices...</p>
        )}
      </article>
    </section>
  );
}
