"use client";

import type { ReactNode } from "react";

export function BottomDrawer({
  open,
  onClose,
  title,
  children,
  testId
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45" data-testid={testId}>
      <button
        aria-label="Close drawer"
        className="absolute inset-0"
        type="button"
        onClick={onClose}
      />
      <section className="relative z-10 w-full rounded-t-[28px] border border-white/10 bg-base-100 p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-base-300" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn btn-ghost btn-sm min-h-[44px]" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
