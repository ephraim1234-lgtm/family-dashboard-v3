"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type DisplayDeviceSummary = {
  deviceId: string;
  deviceName: string;
  isActive: boolean;
  accessTokenHint: string;
  createdAtUtc: string;
};

type DisplayDeviceListState = {
  devices: DisplayDeviceSummary[];
};

type CreateDisplayDeviceState = {
  deviceId: string;
  deviceName: string;
  accessToken: string;
  accessTokenHint: string;
  displayPath: string;
  createdAtUtc: string;
} | null;

export function AdminDisplayManagementPanel() {
  const [devices, setDevices] = useState<DisplayDeviceSummary[]>([]);
  const [latestCreated, setLatestCreated] =
    useState<CreateDisplayDeviceState>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    startTransition(() => {
      refresh().catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load display devices."
        );
      });
    });
  }, []);

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

    setLatestCreated((await response.json()) as CreateDisplayDeviceState);
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
        {status === 200 ? (
          devices.length > 0 ? (
            <ul className="plain-list">
              {devices.map((device) => (
                <li key={device.deviceId}>
                  {device.deviceName} | token hint {device.accessTokenHint} |{" "}
                  {device.isActive ? "active" : "inactive"}
                </li>
              ))}
            </ul>
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
