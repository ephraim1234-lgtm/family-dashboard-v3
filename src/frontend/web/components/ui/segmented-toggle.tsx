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
    <div className="ui-segmented-toggle" data-testid={testId}>
      {options.map((option) => (
        <button
          key={option.value}
          className={[
            "ui-segmented-toggle-option",
            value === option.value ? "ui-segmented-toggle-option-active" : null
          ].filter(Boolean).join(" ")}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
