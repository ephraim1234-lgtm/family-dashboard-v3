import type { EventReminderItem } from "./scheduling-shared";
import {
  formatReminderLeadTime,
  reminderPresetMinutes
} from "./scheduling-shared";

type SchedulingReminderManagerProps = {
  isAllDay: boolean;
  canManageReminders: boolean;
  reminderEligibilityReason: string | null;
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
  canManageReminders,
  reminderEligibilityReason,
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
        Reminders fire before the event starts for local, timed, one-time events.
      </p>
      {reminderEligibilityReason ? (
        <p className="muted">
          {reminderEligibilityReason}
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
            disabled={isPending || !canManageReminders}
          />
        </label>
        <div className="pill-row reminder-preset-row">
          {reminderPresetMinutes.map((preset) => (
            <button
              key={preset}
              className={`pill-button${reminderMinutesBefore === preset ? " pill-button-active" : ""}`}
              onClick={() => onReminderMinutesChange(preset)}
              disabled={isPending || !canManageReminders}
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
          disabled={isPending || isAllDay || !canManageReminders}
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
                    disabled={isPending || !reminder.canDelete}
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
