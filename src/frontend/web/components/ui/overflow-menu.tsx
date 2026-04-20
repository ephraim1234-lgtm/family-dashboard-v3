"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function OverflowMenu({
  items,
  testId
}: {
  items: Array<{ label: string; onClick: () => void; danger?: boolean }>;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" data-testid={testId} ref={rootRef}>
      <button
        aria-expanded={open}
        className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px]"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        ...
      </button>
      {open ? (
        <ul className="absolute right-0 z-20 mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
          {items.map((item) => (
            <li key={item.label}>
              <button
                className={`btn btn-ghost justify-start ${item.danger ? "text-error" : ""} w-full min-h-[44px]`}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
