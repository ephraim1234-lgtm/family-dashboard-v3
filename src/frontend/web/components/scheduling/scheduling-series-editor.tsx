import type { ReactNode } from "react";
import type {
  RecurrencePattern,
  SchedulingEditorState,
  SchedulingEditorSummary
} from "./scheduling-shared";
import { weekdayOptions } from "./scheduling-shared";

type SchedulingSeriesEditorProps = {
  state: SchedulingEditorState;
  summary: SchedulingEditorSummary;
  validationIssues: string[];
  isPending: boolean;
  onStateChange: (patch: Partial<SchedulingEditorState>) => void;
  onToggleWeeklyDay: (day: string) => void;
  onMatchStartDay?: () => void;
  onClearWeeklyDays?: () => void;
  onApplySuggestedEnd: (minutes: number) => void;
  onApplySuggestedRecurrenceLength: (days: number) => void;
  onSubmit: () => void;
  submitLabel: string;
  onCancel?: () => void;
  cancelLabel?: string;
  onReset?: () => void;
  resetLabel?: string;
  children?: ReactNode;
};

export function SchedulingSeriesEditor({
  state,
  summary,
  validationIssues,
  isPending,
  onStateChange,
  onToggleWeeklyDay,
  onMatchStartDay,
  onClearWeeklyDays,
  onApplySuggestedEnd,
  onApplySuggestedRecurrenceLength,
  onSubmit,
  submitLabel,
  onCancel,
  cancelLabel,
  onReset,
  resetLabel,
  children
}: SchedulingSeriesEditorProps) {
  return (
    <>
      <div className="stack-card scheduling-editor-status-card">
        <div className="stack-card-header">
          <div>
            <strong>{onCancel ? "Editing an existing series" : "Drafting a new series"}</strong>
            <div className="muted">
              Times are entered in your current browser locale, then stored in UTC.
            </div>
          </div>
          <span className="pill">
            {onCancel ? "Existing series" : "New draft"}
          </span>
        </div>
        <div className="pill-row">
          <span className="pill">{summary.timingSummary}</span>
          <span className="pill">{summary.recurrenceSummary}</span>
        </div>
        {validationIssues.length > 0 ? (
          <div className="scheduling-validation-list">
            {validationIssues.map((issue) => (
              <div className="error-text" key={issue}>{issue}</div>
            ))}
          </div>
        ) : (
          <div className="muted">Ready to save when you are.</div>
        )}
      </div>

      <div className="form-stack">
        <label className="field">
          <span>Title</span>
          <input
            value={state.title}
            onChange={(event) => onStateChange({ title: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <input
            value={state.description}
            onChange={(event) => onStateChange({ description: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Starts</span>
          <input
            type="datetime-local"
            value={state.startsAtLocal}
            onChange={(event) => onStateChange({ startsAtLocal: event.target.value })}
          />
        </label>

        {!state.isAllDay ? (
          <div className="pill-row scheduling-helper-row">
            <button
              className="pill-button"
              onClick={() => onApplySuggestedEnd(30)}
              disabled={isPending || !state.startsAtLocal}
              type="button"
            >
              End +30m
            </button>
            <button
              className="pill-button"
              onClick={() => onApplySuggestedEnd(60)}
              disabled={isPending || !state.startsAtLocal}
              type="button"
            >
              End +1h
            </button>
            <button
              className="pill-button"
              onClick={() => onApplySuggestedEnd(120)}
              disabled={isPending || !state.startsAtLocal}
              type="button"
            >
              End +2h
            </button>
          </div>
        ) : null}

        <label className="field">
          <span>Ends</span>
          <input
            type="datetime-local"
            value={state.endsAtLocal}
            onChange={(event) => onStateChange({ endsAtLocal: event.target.value })}
            disabled={state.isAllDay}
          />
        </label>

        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={state.isAllDay}
            onChange={(event) => {
              const nextIsAllDay = event.target.checked;
              onStateChange({
                isAllDay: nextIsAllDay,
                endsAtLocal: nextIsAllDay ? "" : state.endsAtLocal
              });
            }}
          />
          <span>All day</span>
        </label>

        <label className="field">
          <span>Recurrence</span>
          <select
            value={state.recurrencePattern}
            onChange={(event) =>
              onStateChange({
                recurrencePattern: event.target.value as RecurrencePattern
              })
            }
          >
            <option value="None">One-time</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
          </select>
        </label>

        {state.recurrencePattern === "Weekly" ? (
          <div className="field">
            <span>Weekly days</span>
            <div className="pill-row">
              {weekdayOptions.map((day) => (
                <label className="pill checkbox-pill" key={day}>
                  <input
                    type="checkbox"
                    checked={state.weeklyDays.includes(day)}
                    onChange={() => onToggleWeeklyDay(day)}
                  />
                  <span>{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
            {state.startsAtLocal ? (
              <div className="pill-row scheduling-helper-row">
                {onMatchStartDay ? (
                  <button
                    className="pill-button"
                    onClick={onMatchStartDay}
                    disabled={isPending}
                    type="button"
                  >
                    Match start day
                  </button>
                ) : null}
                {onClearWeeklyDays ? (
                  <button
                    className="pill-button"
                    onClick={onClearWeeklyDays}
                    disabled={isPending || state.weeklyDays.length === 0}
                    type="button"
                  >
                    Clear days
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {state.recurrencePattern !== "None" ? (
          <>
            <label className="field">
              <span>Repeat until</span>
              <input
                type="datetime-local"
                value={state.recursUntilLocal}
                onChange={(event) => onStateChange({ recursUntilLocal: event.target.value })}
              />
            </label>
            <div className="pill-row scheduling-helper-row">
              <button
                className="pill-button"
                onClick={() => onApplySuggestedRecurrenceLength(7)}
                disabled={isPending || !state.startsAtLocal}
                type="button"
              >
                +7 days
              </button>
              <button
                className="pill-button"
                onClick={() => onApplySuggestedRecurrenceLength(30)}
                disabled={isPending || !state.startsAtLocal}
                type="button"
              >
                +30 days
              </button>
              <button
                className="pill-button"
                onClick={() => onStateChange({ recursUntilLocal: "" })}
                disabled={isPending || !state.recursUntilLocal}
                type="button"
              >
                Clear repeat end
              </button>
            </div>
          </>
        ) : null}
      </div>

      {children}

      <div className="action-row">
        <button
          className="action-button"
          onClick={onSubmit}
          disabled={isPending || validationIssues.length > 0}
          type="button"
        >
          {submitLabel}
        </button>
        {onCancel && cancelLabel ? (
          <button
            className="action-button action-button-ghost"
            onClick={onCancel}
            disabled={isPending}
            type="button"
          >
            {cancelLabel}
          </button>
        ) : null}
        {onReset && resetLabel ? (
          <button
            className="action-button action-button-ghost"
            onClick={onReset}
            disabled={isPending}
            type="button"
          >
            {resetLabel}
          </button>
        ) : null}
      </div>
    </>
  );
}
