import type { EventReminderItem } from "./scheduling-shared";
import {
  formatReminderLeadTime,
  reminderPresetMinutes
} from "./scheduling-shared";

type SchedulingReminderManagerProps = {
  isAllDay: boolean;
  isPending: boolean;
  reminderMinutesBefore: number;
  onReminderMinutesChange: (value: number) => void;
  onAddReminder: () => void;
  reminders: EventReminderItem[];
  reminderError: string | null;
  onDeleteReminder: (reminderId: string) => void;
};

export function SchedulingReminderManager({
  isAllDay,
  isPending,
  reminderMinutesBefore,
  onReminderMinutesChange,
  onAddReminder,
  reminders,
  reminderError,
  onDeleteReminder
}: SchedulingReminderManagerProps) {
  return (
    <div className="reminder-section">
      <div className="eyebrow">Event reminders</div>
      <p className="muted">
        Reminders fire before the event starts. All-day events are not supported.
      </p>
      {isAllDay ? (
        <p className="muted">
          Switch this series back to a timed event if you need reminders.
        </p>
      ) : null}

      <div className="reminder-add-row">
        <label className="field reminder-minutes-field">
          <span>Minutes before</span>
          <input
            type="number"
            min={1}
            max={10080}
            value={reminderMinutesBefore}
            onChange={(event) => onReminderMinutesChange(Number(event.target.value))}
            disabled={isPending}
          />
        </label>
        <div className="pill-row reminder-preset-row">
          {reminderPresetMinutes.map((preset) => (
            <button
              key={preset}
              className={`pill-button${reminderMinutesBefore === preset ? " pill-button-active" : ""}`}
              onClick={() => onReminderMinutesChange(preset)}
              disabled={isPending}
              type="button"
            >
              {preset < 60
                ? `${preset} min`
                : preset === 60
                  ? "1 hr"
                  : "1 day"}
            </button>
          ))}
        </div>
        <button
          className="action-button"
          onClick={onAddReminder}
          disabled={isPending || isAllDay}
          type="button"
        >
          {isPending ? "Saving..." : "Add Reminder"}
        </button>
      </div>

      {reminderError ? <p className="error-text">{reminderError}</p> : null}

      {reminders.length > 0 ? (
        <div className="stack-list reminder-list">
          {reminders.map((reminder) => (
            <div className="stack-card reminder-card" key={reminder.id}>
              <div className="stack-card-header">
                <div>
                  <strong>{formatReminderLeadTime(reminder.minutesBefore)}</strong>
                  <div className="muted">
                    Due {new Date(reminder.dueAtUtc).toLocaleString()}
                  </div>
                </div>
                <div className="pill-row">
                  <span className="pill">{reminder.status}</span>
                  <button
                    className="action-button action-button-secondary"
                    onClick={() => onDeleteReminder(reminder.id)}
                    disabled={isPending}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No reminders set for this event.</p>
      )}
    </div>
  );
}
