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
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="py-4 text-sm opacity-80">{body}</p>
        <div className="modal-action">
          <button className="btn btn-ghost min-h-[44px]" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-error min-h-[44px]"
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
