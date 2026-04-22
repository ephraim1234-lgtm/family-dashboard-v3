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
  createMemberEventDraftForDate,
  getMemberEventValidationIssues
} from "../member-event-draft";
import { useAdminOwnerSession } from "../use-admin-owner-session";
import {
  applySuggestedSeriesEnd,
  buildSeriesEditorSummary,
  createDefaultSchedulingEditorState,
  createSchedulingStateFromSeries,
  deriveWeeklyDayFromStart,
  getSeriesValidationIssues,
  type EventReminderItem,
  type EventReminderListResponse,
  type ScheduledEventSeriesItem,
  type ScheduledEventSeriesListResponse,
  type SchedulingEditorState,
  type UpcomingEventsResponse
} from "../scheduling";
import {
  addDaysUtc,
  addMonthsUtc,
  buildFamilyCalendarViewModel,
  getDefaultSelectedDateForMonth,
  getMonthGridStartUtc,
  getMonthStartUtc,
  getWeekStartUtc,
  type CalendarEventItem,
  type CalendarReminderItem,
  type FamilyCalendarViewModel
} from "@/lib/family-calendar";
import type { HomeResponse } from "@/lib/family-command-center";

type CalendarViewMode = "week" | "agenda";

type CalendarDetailSelection =
  | {
      type: "event";
      item: CalendarEventItem;
    }
  | {
      type: "reminder";
      item: CalendarReminderItem;
    };

type FamilyCalendarContextValue = {
  isLoading: boolean;
  isPending: boolean;
  error: string | null;
  successMessage: string | null;
  isOwner: boolean;
  isAuthenticated: boolean;
  viewMode: CalendarViewMode;
  setViewMode: (value: CalendarViewMode) => void;
  weekStartUtc: string;
  monthStartUtc: string;
  selectedDate: string;
  selectDate: (date: string) => void;
  viewModel: FamilyCalendarViewModel | null;
  homeData: HomeResponse | null;
  selectedDetail: CalendarDetailSelection | null;
  setSelectedDetail: (detail: CalendarDetailSelection | null) => void;
  detailEditorOpen: boolean;
  setDetailEditorOpen: (value: boolean) => void;
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
  resetEventDraftForSelectedDate: () => void;
  prefillEventDraftForSelectedDate: () => void;
  handleAddEvent: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  selectedSeriesItem: ScheduledEventSeriesItem | null;
  seriesEditorState: SchedulingEditorState;
  setSeriesEditorState: (patch: Partial<SchedulingEditorState>) => void;
  seriesValidationIssues: string[];
  seriesEditorSummary: ReturnType<typeof buildSeriesEditorSummary>;
  resetSeriesEditor: () => void;
  toggleSeriesWeeklyDay: (day: string) => void;
  matchSeriesStartDay: () => void;
  clearSeriesWeeklyDays: () => void;
  applySeriesSuggestedEnd: (minutes: number) => void;
  applySeriesSuggestedRecurrenceLength: (days: number) => void;
  handleSaveSeries: () => void;
  handleDeleteSeries: () => void;
  selectedEventReminders: EventReminderItem[];
  reminderMinutesBefore: number;
  setReminderMinutesBefore: (value: number) => void;
  reminderError: string | null;
  handleAddReminder: () => void;
  handleDeleteReminder: (reminderId: string) => void;
  handleDismissReminder: (reminderId: string) => void;
  handleSnoozeReminder: (reminderId: string, snoozeMinutes: number) => void;
};

const FamilyCalendarContext = createContext<FamilyCalendarContextValue | null>(null);

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

async function fetchAgenda(windowStartUtc: string, days: number) {
  const searchParams = new URLSearchParams({
    startUtc: windowStartUtc,
    days: days.toString()
  });
  const response = await fetch(`/api/scheduling/agenda?${searchParams.toString()}`, {
    credentials: "same-origin",
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load calendar agenda: ${response.status}`);
  }

  return (await response.json()) as UpcomingEventsResponse;
}

async function fetchReminders() {
  const response = await fetch("/api/notifications/reminders", {
    credentials: "same-origin",
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    return [] as EventReminderItem[];
  }

  if (!response.ok) {
    throw new Error(`Failed to load reminders: ${response.status}`);
  }

  const body = (await response.json()) as EventReminderListResponse;
  return body.items;
}

async function fetchSeries() {
  const response = await fetch("/api/scheduling/events/series", {
    credentials: "same-origin",
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    return [] as ScheduledEventSeriesItem[];
  }

  if (!response.ok) {
    throw new Error(`Failed to load scheduled event series: ${response.status}`);
  }

  const body = (await response.json()) as ScheduledEventSeriesListResponse;
  return body.items;
}

export function FamilyCalendarProvider({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const { session, isLoading: isSessionLoading, isOwner } = useAdminOwnerSession();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [weekStartUtc, setWeekStartUtc] = useState(() => getWeekStartUtc(new Date()));
  const [monthStartUtc, setMonthStartUtc] = useState(() => getMonthStartUtc(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return getDefaultSelectedDateForMonth(getMonthStartUtc(now), now);
  });
  const [selectedDetail, setSelectedDetailRaw] = useState<CalendarDetailSelection | null>(null);
  const [detailEditorOpen, setDetailEditorOpen] = useState(false);
  const [seriesEditorState, setSeriesEditorStateRaw] = useState<SchedulingEditorState>(
    createDefaultSchedulingEditorState()
  );
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(15);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const defaultEventDraft = useMemo(() => createDefaultMemberEventDraft(), []);
  const [eventTitle, setEventTitle] = useState(defaultEventDraft.title);
  const [eventDesc, setEventDesc] = useState("");
  const [eventAllDay, setEventAllDay] = useState(defaultEventDraft.isAllDay);
  const [eventAllDayDate, setEventAllDayDate] = useState(defaultEventDraft.allDayDate);
  const [eventStart, setEventStart] = useState(defaultEventDraft.startsAtLocal);
  const [eventEnd, setEventEnd] = useState(defaultEventDraft.endsAtLocal);

  const isAuthenticated = session.isAuthenticated;
  const monthGridStartUtc = useMemo(
    () => getMonthGridStartUtc(monthStartUtc),
    [monthStartUtc]
  );

  const homeQuery = useQuery({
    queryKey: ["calendar", "home"],
    queryFn: fetchHome,
    enabled: !isSessionLoading && isAuthenticated
  });

  const weekAgendaQuery = useQuery({
    queryKey: ["calendar", "agenda", "week", weekStartUtc],
    queryFn: () => fetchAgenda(weekStartUtc, 7),
    enabled: !isSessionLoading && isAuthenticated
  });

  const monthAgendaQuery = useQuery({
    queryKey: ["calendar", "agenda", "month", monthGridStartUtc],
    queryFn: () => fetchAgenda(monthGridStartUtc, 42),
    enabled: !isSessionLoading && isAuthenticated
  });

  const reminderQuery = useQuery({
    queryKey: ["calendar", "reminders"],
    queryFn: fetchReminders,
    enabled: !isSessionLoading && isAuthenticated
  });

  const seriesQuery = useQuery({
    queryKey: ["calendar", "series"],
    queryFn: fetchSeries,
    enabled: !isSessionLoading && isOwner
  });

  const selectedSeriesItem = useMemo(() => {
    if (selectedDetail?.type !== "event") {
      return null;
    }

    return (seriesQuery.data ?? []).find((item) => item.id === selectedDetail.item.id) ?? null;
  }, [selectedDetail, seriesQuery.data]);

  useEffect(() => {
    setSelectedDate(getDefaultSelectedDateForMonth(monthStartUtc, new Date()));
  }, [monthStartUtc]);

  useEffect(() => {
    if (!selectedDetail || selectedDetail.type !== "event" || !selectedSeriesItem) {
      return;
    }

    setSeriesEditorStateRaw(createSchedulingStateFromSeries(selectedSeriesItem));
    setDetailEditorOpen(false);
    setReminderMinutesBefore(15);
    setReminderError(null);
  }, [selectedDetail, selectedSeriesItem]);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function refreshCalendar() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["calendar", "agenda"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar", "home"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar", "reminders"] }),
      queryClient.invalidateQueries({ queryKey: ["calendar", "series"] })
    ]);
  }

  function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setActionError(null);
    setReminderError(null);

    startTransition(() => {
      void action().catch((nextError: unknown) => {
        setActionError(nextError instanceof Error ? nextError.message : fallbackMessage);
      });
    });
  }

  function applyEventDraft(nextDraft: ReturnType<typeof createDefaultMemberEventDraft>) {
    setEventTitle(nextDraft.title);
    setEventDesc("");
    setEventAllDay(nextDraft.isAllDay);
    setEventAllDayDate(nextDraft.allDayDate);
    setEventStart(nextDraft.startsAtLocal);
    setEventEnd(nextDraft.endsAtLocal);
  }

  function resetEventDraft() {
    applyEventDraft(createDefaultMemberEventDraft());
  }

  function resetEventDraftForSelectedDate() {
    applyEventDraft(createMemberEventDraftForDate(selectedDate));
  }

  function prefillEventDraftForSelectedDate() {
    const nextDraft = createMemberEventDraftForDate(selectedDate);
    setEventAllDayDate(nextDraft.allDayDate);
    setEventStart(nextDraft.startsAtLocal);
    setEventEnd(nextDraft.endsAtLocal);
  }

  function setSeriesEditorState(patch: Partial<SchedulingEditorState>) {
    setSeriesEditorStateRaw((current) => {
      const next = {
        ...current,
        ...patch
      };

      if (patch.recurrencePattern === "Weekly" && next.weeklyDays.length === 0) {
        const suggestedDay = deriveWeeklyDayFromStart(next.startsAtLocal);
        if (suggestedDay) {
          next.weeklyDays = [suggestedDay];
        }
      }

      return next;
    });
  }

  function resetSeriesEditor() {
    if (selectedSeriesItem) {
      setSeriesEditorStateRaw(createSchedulingStateFromSeries(selectedSeriesItem));
      return;
    }

    setSeriesEditorStateRaw(createDefaultSchedulingEditorState());
  }

  function toggleSeriesWeeklyDay(day: string) {
    setSeriesEditorStateRaw((current) => ({
      ...current,
      weeklyDays: current.weeklyDays.includes(day)
        ? current.weeklyDays.filter((value) => value !== day)
        : [...current.weeklyDays, day]
    }));
  }

  function matchSeriesStartDay() {
    const suggestedDay = deriveWeeklyDayFromStart(seriesEditorState.startsAtLocal);
    if (suggestedDay) {
      setSeriesEditorState({ weeklyDays: [suggestedDay] });
    }
  }

  function clearSeriesWeeklyDays() {
    setSeriesEditorState({ weeklyDays: [] });
  }

  function applySeriesSuggestedEnd(minutes: number) {
    setSeriesEditorState({
      endsAtLocal: applySuggestedSeriesEnd(seriesEditorState.startsAtLocal, minutes)
    });
  }

  function applySeriesSuggestedRecurrenceLength(days: number) {
    if (!seriesEditorState.startsAtLocal) {
      return;
    }

    const base = new Date(seriesEditorState.startsAtLocal);
    base.setDate(base.getDate() + days);
    setSeriesEditorState({
      recursUntilLocal: `${base.getFullYear()}-${`${base.getMonth() + 1}`.padStart(2, "0")}-${`${base.getDate()}`.padStart(2, "0")}T${`${base.getHours()}`.padStart(2, "0")}:${`${base.getMinutes()}`.padStart(2, "0")}`
    });
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
      throw new Error(text || `Failed to add event: ${response.status}`);
    }

    resetEventDraft();
    showSuccess("Event added to the family calendar.");
    await refreshCalendar();
  }

  async function saveSeries() {
    if (!selectedSeriesItem) {
      return;
    }

    const payload = {
      title: seriesEditorState.title.trim(),
      description: seriesEditorState.description.trim() || null,
      isAllDay: seriesEditorState.isAllDay,
      startsAtUtc: seriesEditorState.startsAtLocal
        ? new Date(seriesEditorState.startsAtLocal).toISOString()
        : null,
      endsAtUtc: seriesEditorState.endsAtLocal
        ? new Date(seriesEditorState.endsAtLocal).toISOString()
        : null,
      recurrence:
        seriesEditorState.recurrencePattern === "None"
          ? null
          : {
              pattern: seriesEditorState.recurrencePattern,
              weeklyDays:
                seriesEditorState.recurrencePattern === "Weekly"
                  ? seriesEditorState.weeklyDays
                  : null,
              recursUntilUtc: seriesEditorState.recursUntilLocal
                ? new Date(seriesEditorState.recursUntilLocal).toISOString()
                : null
            }
    };

    const response = await fetch(`/api/scheduling/events/${selectedSeriesItem.id}`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to save event series: ${response.status}`);
    }

    showSuccess("Series updated.");
    setDetailEditorOpen(false);
    await refreshCalendar();
  }

  async function deleteSeries() {
    if (!selectedSeriesItem) {
      return;
    }

    const response = await fetch(`/api/scheduling/events/${selectedSeriesItem.id}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete event series: ${response.status}`);
    }

    showSuccess("Series deleted.");
    setSelectedDetailRaw(null);
    await refreshCalendar();
  }

  async function addReminder() {
    if (selectedDetail?.type !== "event") {
      return;
    }

    const response = await fetch("/api/notifications/reminders", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledEventId: selectedDetail.item.id,
        minutesBefore: reminderMinutesBefore
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to add reminder: ${response.status}`);
    }

    showSuccess("Reminder added.");
    await refreshCalendar();
  }

  async function deleteReminder(reminderId: string) {
    const response = await fetch(`/api/notifications/reminders/${reminderId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete reminder: ${response.status}`);
    }

    showSuccess("Reminder removed.");
    await refreshCalendar();
  }

  async function dismissReminder(reminderId: string) {
    const response = await fetch(`/api/notifications/reminders/${reminderId}/dismiss`, {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to dismiss reminder: ${response.status}`);
    }

    showSuccess("Reminder dismissed.");
    await refreshCalendar();
  }

  async function snoozeReminder(reminderId: string, snoozeMinutes: number) {
    const response = await fetch(`/api/notifications/reminders/${reminderId}/snooze`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snoozeMinutes })
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to snooze reminder: ${response.status}`);
    }

    showSuccess(snoozeMinutes >= 1440 ? "Reminder snoozed for a day." : "Reminder snoozed for an hour.");
    await refreshCalendar();
  }

  const viewModel = useMemo(
    () =>
      buildFamilyCalendarViewModel({
        weekAgenda: weekAgendaQuery.data ?? null,
        monthAgenda: monthAgendaQuery.data ?? null,
        reminders: reminderQuery.data ?? [],
        home: homeQuery.data ?? null,
        seriesItems: seriesQuery.data ?? [],
        isOwner,
        visibleMonthStartUtc: monthStartUtc,
        selectedDate,
        now: new Date()
      }),
    [
      homeQuery.data,
      isOwner,
      monthAgendaQuery.data,
      monthStartUtc,
      reminderQuery.data,
      selectedDate,
      seriesQuery.data,
      weekAgendaQuery.data
    ]
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

  const seriesValidationIssues = useMemo(
    () =>
      getSeriesValidationIssues({
        title: seriesEditorState.title,
        startsAtLocal: seriesEditorState.startsAtLocal,
        endsAtLocal: seriesEditorState.endsAtLocal,
        recurrencePattern: seriesEditorState.recurrencePattern,
        weeklyDays: seriesEditorState.weeklyDays,
        recursUntilLocal: seriesEditorState.recursUntilLocal
      }),
    [seriesEditorState]
  );

  const seriesEditorSummary = useMemo(
    () => buildSeriesEditorSummary(seriesEditorState),
    [seriesEditorState]
  );

  const selectedEventReminders = useMemo(() => {
    if (selectedDetail?.type !== "event") {
      return [];
    }

    return (reminderQuery.data ?? []).filter(
      (item) => item.scheduledEventId === selectedDetail.item.id
    );
  }, [reminderQuery.data, selectedDetail]);

  const error =
    actionError
    ?? (weekAgendaQuery.error instanceof Error ? weekAgendaQuery.error.message : null)
    ?? (monthAgendaQuery.error instanceof Error ? monthAgendaQuery.error.message : null)
    ?? (homeQuery.error instanceof Error ? homeQuery.error.message : null)
    ?? (reminderQuery.error instanceof Error ? reminderQuery.error.message : null)
    ?? (seriesQuery.error instanceof Error ? seriesQuery.error.message : null);

  const value: FamilyCalendarContextValue = {
    isLoading:
      isSessionLoading
      || weekAgendaQuery.isLoading
      || monthAgendaQuery.isLoading
      || homeQuery.isLoading
      || reminderQuery.isLoading,
    isPending,
    error,
    successMessage,
    isOwner,
    isAuthenticated,
    viewMode,
    setViewMode,
    weekStartUtc,
    monthStartUtc,
    selectedDate,
    selectDate: setSelectedDate,
    viewModel,
    homeData: homeQuery.data ?? null,
    selectedDetail,
    setSelectedDetail: (detail) => {
      setSelectedDetailRaw(detail);
      setDetailEditorOpen(false);
      setReminderError(null);
    },
    detailEditorOpen,
    setDetailEditorOpen,
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
    resetEventDraftForSelectedDate,
    prefillEventDraftForSelectedDate,
    handleAddEvent: () => {
      if (eventValidationIssues.length > 0) {
        return;
      }

      runAction(addEvent, "Unable to add event.");
    },
    goToPreviousWeek: () => setWeekStartUtc((current) => addDaysUtc(current, -7)),
    goToNextWeek: () => setWeekStartUtc((current) => addDaysUtc(current, 7)),
    goToCurrentWeek: () => setWeekStartUtc(getWeekStartUtc(new Date())),
    goToPreviousMonth: () => setMonthStartUtc((current) => addMonthsUtc(current, -1)),
    goToNextMonth: () => setMonthStartUtc((current) => addMonthsUtc(current, 1)),
    goToCurrentMonth: () => setMonthStartUtc(getMonthStartUtc(new Date())),
    selectedSeriesItem,
    seriesEditorState,
    setSeriesEditorState,
    seriesValidationIssues,
    seriesEditorSummary,
    resetSeriesEditor,
    toggleSeriesWeeklyDay,
    matchSeriesStartDay,
    clearSeriesWeeklyDays,
    applySeriesSuggestedEnd,
    applySeriesSuggestedRecurrenceLength,
    handleSaveSeries: () => {
      if (!selectedSeriesItem || seriesValidationIssues.length > 0) {
        return;
      }

      runAction(saveSeries, "Unable to save the event series.");
    },
    handleDeleteSeries: () => runAction(deleteSeries, "Unable to delete the event series."),
    selectedEventReminders,
    reminderMinutesBefore,
    setReminderMinutesBefore,
    reminderError,
    handleAddReminder: () => runAction(addReminder, "Unable to add reminder."),
    handleDeleteReminder: (reminderId) =>
      runAction(() => deleteReminder(reminderId), "Unable to delete reminder."),
    handleDismissReminder: (reminderId) =>
      runAction(() => dismissReminder(reminderId), "Unable to dismiss reminder."),
    handleSnoozeReminder: (reminderId, snoozeMinutes) =>
      runAction(() => snoozeReminder(reminderId, snoozeMinutes), "Unable to snooze reminder.")
  };

  return (
    <FamilyCalendarContext.Provider value={value}>
      {children}
    </FamilyCalendarContext.Provider>
  );
}

export function useFamilyCalendarContext() {
  const context = useContext(FamilyCalendarContext);

  if (!context) {
    throw new Error("FamilyCalendarContext is not available.");
  }

  return context;
}
