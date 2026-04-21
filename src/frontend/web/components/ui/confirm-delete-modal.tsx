"use client";

export function ConfirmDeleteModal({
  open,
  title,
  body,
  destructiveLabel,
  isPending,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  body: string;
  destructiveLabel: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop">
      <div className="ui-modal-panel">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="py-4 text-sm ui-text-muted">{body}</p>
        <div className="ui-modal-actions">
          <button className="ui-button ui-button-ghost ui-button-sm" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="ui-button ui-button-danger ui-button-sm"
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {destructiveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
