"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition
} from "react";
import {
  applySuggestedEnd,
  buildMemberEventRequest,
  createDefaultMemberEventDraft,
  getMemberEventValidationIssues
} from "../member-event-draft";
import { useAdminOwnerSession } from "../use-admin-owner-session";

export type HouseholdMemberOption = {
  membershipId: string;
  displayName: string;
};

export type HomeEvent = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isImported: boolean;
};

export type HomeChore = {
  id: string;
  title: string;
  assignedMembershipId: string | null;
  assignedMemberName: string | null;
  completedToday: boolean;
};

export type HomeNote = {
  id: string;
  title: string;
  body: string | null;
  authorDisplayName: string;
};

export type HomeActivityItem = {
  kind: "ChoreCompletion" | "NoteCreated" | "ReminderFired";
  title: string;
  detail: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
};

export type HomeUpcomingEvent = {
  scheduledEventId: string;
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isImported: boolean;
};

export type HomeUpcomingDay = {
  date: string;
  events: HomeUpcomingEvent[];
};

export type HomeReminder = {
  id: string;
  eventTitle: string;
  minutesBefore: number;
  dueAtUtc: string;
};

export type HomeMemberChoreProgress = {
  memberDisplayName: string;
  completionsThisWeek: number;
  currentStreakDays: number;
};

export type HomeResponse = {
  todayEvents: HomeEvent[];
  todayChores: HomeChore[];
  pinnedNotes: HomeNote[];
  recentActivity: HomeActivityItem[];
  upcomingDays: HomeUpcomingDay[];
  pendingReminders: HomeReminder[];
  memberChoreProgress: HomeMemberChoreProgress[];
  upcomingEventCount: number;
  pendingReminderCount: number;
};

type OverviewContextValue = {
  data: HomeResponse | null;
  isLoading: boolean;
  isPending: boolean;
  error: string | null;
  successMessage: string | null;
  isOwner: boolean;
  members: HouseholdMemberOption[];
  incompleteChores: HomeChore[];
  doneChores: HomeChore[];
  overdueReminders: HomeReminder[];
  upcomingReminders: HomeReminder[];
  hasTodayContent: boolean;
  showNoteForm: boolean;
  setShowNoteForm: (value: boolean) => void;
  noteTitle: string;
  setNoteTitle: (value: string) => void;
  noteBody: string;
  setNoteBody: (value: string) => void;
  showReminderForm: boolean;
  setShowReminderForm: (value: boolean) => void;
  reminderEventId: string;
  setReminderEventId: (value: string) => void;
  reminderMinutes: string;
  setReminderMinutes: (value: string) => void;
  showEventForm: boolean;
  setShowEventForm: (value: boolean) => void;
  eventTitle: string;
  setEventTitle: (value: string) => void;
  eventDesc: string;
  setEventDesc: (value: string) => void;
  eventAllDay: boolean;
  setEventAllDay: (value: boolean) => void;
  eventAllDayDate: string;
  setEventAllDayDate: (value: string) => void;
  eventStart: string;
  setEventStart: (value: string) => void;
  eventEnd: string;
  setEventEnd: (value: string) => void;
  eventValidationIssues: string[];
  resetEventDraft: () => void;
  handleComplete: (choreId: string) => void;
  handleReassign: (choreId: string, membershipId: string | null) => void;
  handleAddNote: () => void;
  handleTogglePin: (noteId: string) => void;
  handleDismissReminder: (id: string) => void;
  handleSnoozeReminder: (id: string, snoozeMinutes: number) => void;
  handleAddReminder: () => void;
  handleAddEvent: () => void;
  formatTime: (isoString: string | null) => string;
  formatRelativeTime: (utc: string) => string;
  formatDayLabel: (dateStr: string) => string;
  formatWeekdayShort: (dateStr: string) => string;
  formatReminderDueLabel: (utc: string) => string;
  formatReminderTriageState: (utc: string) => string;
  applySuggestedEnd: (startsAtLocal: string, minutes: number) => string;
};

const OverviewContext = createContext<OverviewContextValue | null>(null);

async function fetchHome() {
  const response = await fetch("/api/app/home", {
    credentials: "same-origin",
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load home: ${response.status}`);
  }

  return (await response.json()) as HomeResponse;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRelativeTime(utc: string): string {
  const diffMs = Date.now() - new Date(utc).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDayLabel(dateStr: string): string {
  const day = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (day.toDateString() === today.toDateString()) return "Today";
  if (day.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return day.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatWeekdayShort(dateStr: string): string {
  const day = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  if (day.toDateString() === today.toDateString()) return "Today";
  return day.toLocaleDateString([], { weekday: "short" });
}

function formatReminderDueLabel(utc: string): string {
  const due = new Date(utc);
  return (
    due.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
    " " +
    due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function formatReminderTriageState(utc: string): string {
  const deltaMinutes = Math.round((new Date(utc).getTime() - Date.now()) / 60_000);

  if (deltaMinutes < 0) {
    const overdueMinutes = Math.abs(deltaMinutes);
    if (overdueMinutes < 60) return `Overdue by ${overdueMinutes} min`;
    if (overdueMinutes % 60 === 0) return `Overdue by ${overdueMinutes / 60} hr`;
    return `Overdue by ${overdueMinutes} min`;
  }

  if (deltaMinutes < 60) return `Due in ${deltaMinutes} min`;
  if (deltaMinutes % 60 === 0) return `Due in ${deltaMinutes / 60} hr`;
  return `Due in ${deltaMinutes} min`;
}

export function OverviewProvider({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const { isOwner } = useAdminOwnerSession();
  const [isPending, startTransition] = useTransition();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<HouseholdMemberOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderEventId, setReminderEventId] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState("30");

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventAllDayDate, setEventAllDayDate] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");

  const homeQuery = useQuery({
    queryKey: ["overview", "home"],
    queryFn: fetchHome
  });

  function showSuccess(message: string) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function refreshHome() {
    await queryClient.invalidateQueries({ queryKey: ["overview", "home"] });
  }

  function resetEventDraft() {
    const nextDraft = createDefaultMemberEventDraft();
    setEventTitle(nextDraft.title);
    setEventDesc("");
    setEventAllDay(nextDraft.isAllDay);
    setEventAllDayDate(nextDraft.allDayDate);
    setEventStart(nextDraft.startsAtLocal);
    setEventEnd(nextDraft.endsAtLocal);
  }

  useEffect(() => {
    resetEventDraft();
  }, []);

  useEffect(() => {
    if (homeQuery.error instanceof Error) {
      setError(homeQuery.error.message);
    }
  }, [homeQuery.error]);

  useEffect(() => {
    if (homeQuery.data) {
      setCompletedIds(new Set());
    }
  }, [homeQuery.data]);

  useEffect(() => {
    if (!isOwner) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/households/members", {
          credentials: "same-origin",
          cache: "no-store"
        });

        if (!response.ok) return;

        const body = (await response.json()) as {
          items: HouseholdMemberOption[];
        };

        if (!cancelled) {
          setMembers(body.items);
        }
      } catch {
        if (!cancelled) {
          setMembers([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const data = homeQuery.data ?? null;
  const incompleteChores = data?.todayChores.filter(
    (chore) => !chore.completedToday && !completedIds.has(chore.id)
  ) ?? [];
  const doneChores = data?.todayChores.filter(
    (chore) => chore.completedToday || completedIds.has(chore.id)
  ) ?? [];
  const overdueReminders = data?.pendingReminders.filter(
    (reminder) => new Date(reminder.dueAtUtc).getTime() < Date.now()
  ) ?? [];
  const upcomingReminders = data?.pendingReminders.filter(
    (reminder) => new Date(reminder.dueAtUtc).getTime() >= Date.now()
  ) ?? [];
  const hasTodayContent = data != null && (
    data.todayEvents.length > 0 ||
    data.todayChores.length > 0 ||
    data.pendingReminderCount > 0
  );

  const eventValidationIssues = getMemberEventValidationIssues({
    title: eventTitle,
    isAllDay: eventAllDay,
    allDayDate: eventAllDayDate,
    startsAtLocal: eventStart,
    endsAtLocal: eventEnd
  });

  function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setError(null);

    startTransition(() => {
      void action().catch((actionError: unknown) => {
        setError(actionError instanceof Error ? actionError.message : fallbackMessage);
      });
    });
  }

  async function reassignChore(choreId: string, membershipId: string | null) {
    const response = await fetch(`/api/chores/${choreId}/assignee`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: membershipId })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Reassign failed with ${response.status}.`);
    }

    await refreshHome();
  }

  async function completeChore(choreId: string) {
    const response = await fetch(`/api/chores/${choreId}/complete`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: null })
    });

    if (!response.ok) {
      throw new Error(`Complete failed with ${response.status}.`);
    }

    setCompletedIds((current) => new Set([...current, choreId]));
  }

  async function addNote() {
    const response = await fetch("/api/notes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: noteTitle.trim(),
        body: noteBody.trim() || null
      })
    });

    if (!response.ok) {
      throw new Error(`Add note failed with ${response.status}.`);
    }

    setNoteTitle("");
    setNoteBody("");
    setShowNoteForm(false);
    showSuccess("Note added.");
    await refreshHome();
  }

  async function togglePin(noteId: string) {
    const response = await fetch(`/api/notes/${noteId}/pin`, {
      method: "PATCH",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(`Pin toggle failed with ${response.status}.`);
    }

    await refreshHome();
  }

  async function dismissReminder(id: string) {
    const response = await fetch(`/api/notifications/reminders/${id}/dismiss`, {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(`Dismiss failed with ${response.status}.`);
    }

    showSuccess("Reminder dismissed.");
    await refreshHome();
  }

  async function snoozeReminder(id: string, snoozeMinutes: number) {
    const response = await fetch(`/api/notifications/reminders/${id}/snooze`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snoozeMinutes })
    });

    if (!response.ok) {
      throw new Error(`Snooze failed with ${response.status}.`);
    }

    showSuccess(snoozeMinutes >= 1440 ? "Snoozed 1 day." : "Snoozed 1 hour.");
    await refreshHome();
  }

  async function addReminder() {
    const minutes = parseInt(reminderMinutes, 10);
    if (!reminderEventId || !Number.isFinite(minutes) || minutes < 1) return;

    const response = await fetch("/api/notifications/reminders", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledEventId: reminderEventId,
        minutesBefore: minutes
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}.`);
    }

    setReminderEventId("");
    setReminderMinutes("30");
    setShowReminderForm(false);
    showSuccess("Reminder scheduled.");
    await refreshHome();
  }

  async function addEvent() {
    const body = buildMemberEventRequest({
      title: eventTitle,
      description: eventDesc,
      isAllDay: eventAllDay,
      allDayDate: eventAllDayDate,
      startsAtLocal: eventStart,
      endsAtLocal: eventEnd
    });

    const response = await fetch("/api/scheduling/events/member", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with ${response.status}.`);
    }

    resetEventDraft();
    setShowEventForm(false);
    showSuccess("Event added.");
    await refreshHome();
  }

  const value = useMemo<OverviewContextValue>(() => ({
    data,
    isLoading: homeQuery.isLoading,
    isPending,
    error,
    successMessage,
    isOwner,
    members,
    incompleteChores,
    doneChores,
    overdueReminders,
    upcomingReminders,
    hasTodayContent,
    showNoteForm,
    setShowNoteForm,
    noteTitle,
    setNoteTitle,
    noteBody,
    setNoteBody,
    showReminderForm,
    setShowReminderForm,
    reminderEventId,
    setReminderEventId,
    reminderMinutes,
    setReminderMinutes,
    showEventForm,
    setShowEventForm,
    eventTitle,
    setEventTitle,
    eventDesc,
    setEventDesc,
    eventAllDay,
    setEventAllDay,
    eventAllDayDate,
    setEventAllDayDate,
    eventStart,
    setEventStart,
    eventEnd,
    setEventEnd,
    eventValidationIssues,
    resetEventDraft,
    handleComplete: (choreId) => runAction(() => completeChore(choreId), "Unable to complete chore."),
    handleReassign: (choreId, membershipId) => runAction(
      () => reassignChore(choreId, membershipId),
      "Unable to reassign chore."
    ),
    handleAddNote: () => {
      if (!noteTitle.trim()) return;
      runAction(addNote, "Unable to add note.");
    },
    handleTogglePin: (noteId) => runAction(() => togglePin(noteId), "Unable to toggle pin."),
    handleDismissReminder: (id) => runAction(
      () => dismissReminder(id),
      "Unable to dismiss reminder."
    ),
    handleSnoozeReminder: (id, snoozeMinutes) => runAction(
      () => snoozeReminder(id, snoozeMinutes),
      "Unable to snooze reminder."
    ),
    handleAddReminder: () => runAction(addReminder, "Unable to schedule reminder."),
    handleAddEvent: () => {
      if (eventValidationIssues.length > 0) return;
      runAction(addEvent, "Unable to add event.");
    },
    formatTime,
    formatRelativeTime,
    formatDayLabel,
    formatWeekdayShort,
    formatReminderDueLabel,
    formatReminderTriageState,
    applySuggestedEnd
  }), [
    data,
    homeQuery.isLoading,
    isPending,
    error,
    successMessage,
    isOwner,
    members,
    incompleteChores,
    doneChores,
    overdueReminders,
    upcomingReminders,
    hasTodayContent,
    showNoteForm,
    noteTitle,
    noteBody,
    showReminderForm,
    reminderEventId,
    reminderMinutes,
    showEventForm,
    eventTitle,
    eventDesc,
    eventAllDay,
    eventAllDayDate,
    eventStart,
    eventEnd,
    eventValidationIssues
  ]);

  return (
    <OverviewContext.Provider value={value}>
      {children}
    </OverviewContext.Provider>
  );
}

export function useOverviewContext() {
  const context = useContext(OverviewContext);

  if (!context) {
    throw new Error("OverviewContext is not available.");
  }

  return context;
}
