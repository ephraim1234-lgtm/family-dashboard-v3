"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
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
import {
  buildCommandCenterViewModel,
  type CommandCenterViewModel,
  type HomeResponse,
  type HouseholdMemberOption
} from "@/lib/family-command-center";

type FamilyCommandCenterContextValue = {
  data: HomeResponse | null;
  viewModel: CommandCenterViewModel | null;
  isLoading: boolean;
  isPending: boolean;
  error: string | null;
  successMessage: string | null;
  isOwner: boolean;
  members: HouseholdMemberOption[];
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
  applySuggestedEnd: (startsAtLocal: string, minutes: number) => string;
};

const FamilyCommandCenterContext = createContext<FamilyCommandCenterContextValue | null>(null);

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

async function fetchMembers() {
  const response = await fetch("/api/households/members", {
    credentials: "same-origin",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load household members: ${response.status}`);
  }

  const body = (await response.json()) as {
    items: HouseholdMemberOption[];
  };

  return body.items;
}

export function FamilyCommandCenterProvider({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const { isOwner } = useAdminOwnerSession();
  const [isPending, startTransition] = useTransition();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderEventId, setReminderEventId] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState("30");

  const defaultEventDraft = useMemo(() => createDefaultMemberEventDraft(), []);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState(defaultEventDraft.title);
  const [eventDesc, setEventDesc] = useState("");
  const [eventAllDay, setEventAllDay] = useState(defaultEventDraft.isAllDay);
  const [eventAllDayDate, setEventAllDayDate] = useState(defaultEventDraft.allDayDate);
  const [eventStart, setEventStart] = useState(defaultEventDraft.startsAtLocal);
  const [eventEnd, setEventEnd] = useState(defaultEventDraft.endsAtLocal);

  const homeQuery = useQuery({
    queryKey: ["overview", "home"],
    queryFn: fetchHome
  });

  const membersQuery = useQuery({
    queryKey: ["overview", "members"],
    queryFn: fetchMembers,
    enabled: isOwner
  });

  function showSuccess(message: string) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3_000);
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

  const data = useMemo<HomeResponse | null>(() => {
    if (!homeQuery.data) {
      return null;
    }

    return {
      ...homeQuery.data,
      todayChores: homeQuery.data.todayChores.map((chore) => ({
        ...chore,
        completedToday: chore.completedToday || completedIds.has(chore.id)
      }))
    };
  }, [completedIds, homeQuery.data]);

  const viewModel = useMemo(
    () => (data ? buildCommandCenterViewModel(data, new Date()) : null),
    [data]
  );

  const eventValidationIssues = useMemo(
    () =>
      getMemberEventValidationIssues({
        title: eventTitle,
        isAllDay: eventAllDay,
        allDayDate: eventAllDayDate,
        startsAtLocal: eventStart,
        endsAtLocal: eventEnd
      }),
    [eventAllDay, eventAllDayDate, eventEnd, eventStart, eventTitle]
  );

  function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setActionError(null);

    startTransition(() => {
      void action().catch((nextError: unknown) => {
        setActionError(nextError instanceof Error ? nextError.message : fallbackMessage);
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

    showSuccess(snoozeMinutes >= 1_440 ? "Snoozed 1 day." : "Snoozed 1 hour.");
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

  const error = actionError
    ?? (homeQuery.error instanceof Error ? homeQuery.error.message : null)
    ?? (membersQuery.error instanceof Error ? membersQuery.error.message : null);

  const value = useMemo<FamilyCommandCenterContextValue>(() => ({
    data,
    viewModel,
    isLoading: homeQuery.isLoading,
    isPending,
    error,
    successMessage,
    isOwner,
    members: membersQuery.data ?? [],
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
    applySuggestedEnd
  }), [
    data,
    error,
    eventAllDay,
    eventAllDayDate,
    eventDesc,
    eventEnd,
    eventStart,
    eventTitle,
    eventValidationIssues,
    homeQuery.isLoading,
    isOwner,
    isPending,
    membersQuery.data,
    noteBody,
    noteTitle,
    reminderEventId,
    reminderMinutes,
    showEventForm,
    showNoteForm,
    showReminderForm,
    successMessage,
    viewModel
  ]);

  return (
    <FamilyCommandCenterContext.Provider value={value}>
      {children}
    </FamilyCommandCenterContext.Provider>
  );
}

export function useFamilyCommandCenterContext() {
  const context = useContext(FamilyCommandCenterContext);

  if (!context) {
    throw new Error("FamilyCommandCenterContext is not available.");
  }

  return context;
}
