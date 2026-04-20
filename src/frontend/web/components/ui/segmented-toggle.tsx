"use client";

export function SegmentedToggle<TValue extends string>({
  value,
  options,
  onChange,
  testId
}: {
  value: TValue;
  options: Array<{ label: string; value: TValue }>;
  onChange: (value: TValue) => void;
  testId?: string;
}) {
  return (
    <div className="join" data-testid={testId}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`btn join-item min-h-[44px] ${value === option.value ? "btn-active" : "btn-ghost"}`}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
