"use client";

import { useEffect, useRef, useState } from "react";

type UndoToastState = {
  id: number;
  message: string;
  undoLabel: string;
  onUndo: () => Promise<void> | void;
};

export function useUndoToast() {
  const nextIdRef = useRef(0);
  const [toast, setToast] = useState<UndoToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showUndoToast(message: string, onUndo: () => Promise<void> | void, undoLabel = "Undo") {
    nextIdRef.current += 1;
    setToast({
      id: nextIdRef.current,
      message,
      undoLabel,
      onUndo
    });
  }

  return { toast, setToast, showUndoToast };
}

export function UndoToast({
  toast,
  clearToast
}: {
  toast: UndoToastState | null;
  clearToast: () => void;
}) {
  if (!toast) {
    return null;
  }

  return (
    <div className="ui-toast-shell z-50">
      <div className="ui-alert shadow-lg">
        <span>{toast.message}</span>
        <button
          className="ui-button ui-button-sm"
          type="button"
          onClick={async () => {
            await toast.onUndo();
            clearToast();
          }}
        >
          {toast.undoLabel}
        </button>
      </div>
    </div>
  );
}
