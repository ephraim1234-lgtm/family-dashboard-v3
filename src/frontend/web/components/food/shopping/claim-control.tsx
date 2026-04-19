"use client";

type ClaimControlProps = {
  claimed: boolean;
  disabled?: boolean;
  onClaim: () => void;
  onRelease: () => void;
};

export function ClaimControl({ claimed, disabled, onClaim, onRelease }: ClaimControlProps) {
  return (
    <button
      className="food-secondary-button"
      type="button"
      disabled={disabled}
      onClick={claimed ? onRelease : onClaim}
    >
      {claimed ? "Release" : "Claim"}
    </button>
  );
}
