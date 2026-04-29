import React, { useContext, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlarmClockCheck,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FolderKanban,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AppContext } from "./Root";
import { DateRangeFilter } from "./DateRangeFilter";
import { emptyDateRange, filterByDateRange } from "../lib/dateFilters";
import {
  OPERATIONS_TEAMS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  normalizeOpsCampaigns,
  type AssignmentMode,
  type TaskPriority,
  type TaskStatus,
} from "../lib/operations";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PMOTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  teamId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignmentMode: AssignmentMode;
  assignedToName: string;
  assignedToEmail: string;
  notes: string;
  linkedCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskFormValues = {
  title: string;
  description: string;
  category: string;
  teamId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignmentMode: AssignmentMode;
  assigneeEmail: string;
  notes: string;
  linkedCampaignId: string;
};

type RoutineItem = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const PMO_CATEGORIES = [
  "Planning",
  "Briefing",
  "Execution",
  "Monitoring & Control",
  "Reporting",
  "Review",
  "Risk & Issues",
  "Stakeholder",
  "Admin",
  "Other",
] as const;

const DEFAULT_ROUTINES: Array<Omit<RoutineItem, "completed">> = [
  {
    id: "ops-priority-scan",
    title: "Priority Scan",
    description: "Review blocked items, overdue tasks, and today's high-priority delivery points.",
  },
  {
    id: "campaign-followups",
    title: "Campaign Follow-ups",
    description: "Clear confirmation gaps, owner follow-ups, and pending stakeholder replies.",
  },
  {
    id: "quality-check",
    title: "Quality Check",
    description: "Audit the riskiest live work and capture any correction or escalation needed.",
  },
  {
    id: "end-of-day-handover",
    title: "End-of-day Handover",
    description: "Summarize progress, blockers, and next actions before the shift closes.",
  },
];

const STATUS_STYLES: Record<TaskStatus, string> = {
  Pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  Medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRoutinesKey(email: string) {
  return `trygc-daily-routines:${email || "workspace"}`;
}

function createDefaultRoutines(): RoutineItem[] {
  return DEFAULT_ROUTINES.map((r) => ({ ...r, completed: false }));
}

function normalizeRoutines(raw: unknown): RoutineItem[] {
  if (!Array.isArray(raw)) return createDefaultRoutines();
  return raw.map((r) => ({
    id: typeof r?.id === "string" && r.id ? r.id : uid("routine"),
    title: typeof r?.title === "string" ? r.title : "New Routine",
    description: typeof r?.description === "string" ? r.description : "",
    completed: Boolean(r?.completed),
  }));
}

function moveItem<T extends { id: string }>(items: T[], id: string, dir: -1 | 1): T[] {
  const i = items.findIndex((x) => x.id === id);
  if (i === -1) return items;
  const j = i + dir;
  if (j < 0 || j >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(i, 1);
  next.splice(j, 0, item);
  return next;
}

function blankTask(overrides?: Partial<PMOTask>): PMOTask {
  const now = new Date().toISOString();
  return {
    id: uid("pmo"),
    title: "",
    description: "",
    category: "Execution",
    teamId: OPERATIONS_TEAMS[0].id,
    status: "Pending",
    priority: "Medium",
    dueDate: "",
    assignmentMode: "unassigned",
    assignedToName: "",
    assignedToEmail: "",
    notes: "",
    linkedCampaignId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksDailyRoutines() {
  const ctx = useContext(AppContext);
  const opsCampaigns = normalizeOpsCampaigns(ctx?.opsCampaigns || []);
  const teamMembers: Array<{ email: string; name: string; teamName?: string }> = ctx?.teamMembers || [];
  const pmoTasks: PMOTask[] = ctx?.standaloneTasks || [];
  const setPmoTasks = ctx?.setStandaloneTasks || (() => {});
  const setTaskNotifications = ctx?.setTaskNotifications || (() => {});
  const userEmail: string = ctx?.userEmail || "";
  const disabledTeams: string[] = ctx?.disabledTeams || [];
  const enabledTeams = OPERATIONS_TEAMS.filter((t) => !disabledTeams.includes(t.id));

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [dateRange, setDateRange] = useState(emptyDateRange);
  const [editingTask, setEditingTask] = useState<PMOTask | null | "new">(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  // ── Routines ─────────────────────────────────────────────────────────────────
  const [routines, setRoutines] = useState<RoutineItem[]>(createDefaultRoutines);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(getRoutinesKey(userEmail));
      setRoutines(raw ? normalizeRoutines(JSON.parse(raw)) : createDefaultRoutines());
    } catch {
      setRoutines(createDefaultRoutines());
    }
  }, [userEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getRoutinesKey(userEmail), JSON.stringify(routines));
  }, [routines, userEmail]);

  // ── Filtered view ─────────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const matched = pmoTasks.filter((t) => {
      if (
        deferredSearch &&
        !t.title.toLowerCase().includes(deferredSearch) &&
        !t.description.toLowerCase().includes(deferredSearch) &&
        !t.category.toLowerCase().includes(deferredSearch) &&
        !(t.assignedToName || "").toLowerCase().includes(deferredSearch) &&
        !(t.notes || "").toLowerCase().includes(deferredSearch)
      ) {
        return false;
      }
      if (disabledTeams.includes(t.teamId)) return false;
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (teamFilter !== "All" && t.teamId !== teamFilter) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (campaignFilter !== "All") {
        if (campaignFilter === "__none__" && t.linkedCampaignId) return false;
        if (campaignFilter !== "__none__" && t.linkedCampaignId !== campaignFilter) return false;
      }
      return true;
    });
    return filterByDateRange(matched, dateRange, (t) => t.dueDate || t.updatedAt || t.createdAt);
  }, [pmoTasks, deferredSearch, categoryFilter, teamFilter, statusFilter, priorityFilter, campaignFilter, dateRange]);

  // ── Summary ───────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: filteredTasks.length,
      inProgress: filteredTasks.filter((t) => t.status === "In Progress").length,
      blocked: filteredTasks.filter((t) => t.status === "Blocked").length,
      dueToday: filteredTasks.filter((t) => t.dueDate?.slice(0, 10) === today).length,
      done: filteredTasks.filter((t) => t.status === "Done").length,
    };
  }, [filteredTasks]);

  const routinesDone = routines.filter((r) => r.completed).length;
  const routinesTotal = routines.length;
  const routinesPercent = routinesTotal > 0 ? Math.round((routinesDone / routinesTotal) * 100) : 0;

  // ── Task actions ──────────────────────────────────────────────────────────────
  const saveTask = (task: PMOTask) => {
    const previousTask = pmoTasks.find((t) => t.id === task.id);
    const exists = Boolean(previousTask);
    if (exists) {
      setPmoTasks((prev: PMOTask[]) => prev.map((t) => (t.id === task.id ? task : t)));
      toast.success("Task updated");
    } else {
      setPmoTasks((prev: PMOTask[]) => [task, ...prev]);
      toast.success("Task created");
    }

    // Create a task_assigned notification when a person is assigned (new or changed)
    const wasAssignedTo = previousTask?.assignedToEmail?.toLowerCase() || '';
    const isAssignedTo = task.assignedToEmail?.toLowerCase() || '';
    const assignmentChanged =
      task.assignmentMode === 'person' &&
      isAssignedTo &&
      (!exists || wasAssignedTo !== isAssignedTo);

    if (assignmentChanged) {
      const now = new Date();
      const notification = {
        id: `assign-pmo-${task.id}-${now.getTime()}`,
        type: 'task_assigned',
        taskId: task.id,
        taskName: task.title,
        taskDescription: task.description,
        assignedTo: isAssignedTo,
        assignedToName: task.assignedToName,
        assignedBy: userEmail,
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        read: false,
      };
      setTaskNotifications((current) => [notification, ...current]);
    }

    setEditingTask(null);
  };

  const updateField = <K extends keyof PMOTask>(id: string, field: K, value: PMOTask[K]) => {
    setPmoTasks((prev: PMOTask[]) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value, updatedAt: new Date().toISOString() } : t)),
    );
  };

  const deleteTask = (id: string) => {
    setPmoTasks((prev: PMOTask[]) => prev.filter((t) => t.id !== id));
    toast.success("Task removed");
  };

  // ── Routine actions ───────────────────────────────────────────────────────────
  const addRoutine = () =>
    setRoutines((p) => [...p, { id: uid("routine"), title: "New Routine", description: "", completed: false }]);
  const deleteRoutine = (id: string) => setRoutines((p) => p.filter((r) => r.id !== id));
  const updateRoutine = (id: string, field: keyof RoutineItem, value: string | boolean) =>
    setRoutines((p) => p.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const moveRoutine = (id: string, dir: -1 | 1) => setRoutines((p) => moveItem(p, id, dir));
  const resetRoutines = () => { setRoutines(createDefaultRoutines()); toast.success("Routines restored"); };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

        {/* ── Page header ── */}
        <section className="overflow-hidden rounded-[var(--app-card-radius)] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">PMO Workspace</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  Tasks &amp; Daily Routines
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
                  Manually track every PMO task, deliverable, and follow-up. Campaign links are optional — keep tasks standalone or tie them to a running campaign.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <button
                  onClick={() => setEditingTask("new")}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "var(--app-primary, #18181b)",
                    color: "rgb(var(--app-primary-contrast-rgb, 255 255 255))",
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add PMO Task
                </button>
                <button
                  onClick={addRoutine}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  <Plus className="h-4 w-4" />
                  Add Routine
                </button>
                <button
                  onClick={resetRoutines}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Routines
                </button>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800 sm:grid-cols-4 sm:divide-y-0">
            <StatTile label="Total Tasks" value={summary.total} sub={`${summary.done} done`} icon={ClipboardList} accent="neutral" />
            <StatTile label="In Progress" value={summary.inProgress} sub="active" icon={ListChecks} accent="amber" />
            <StatTile label="Due Today" value={summary.dueToday} sub="deadline" icon={AlarmClockCheck} accent="blue" />
            <StatTile label="Blocked" value={summary.blocked} sub="need action" icon={CircleAlert} accent="red" />
          </div>
        </section>

        {/* ── Body ── */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.82fr)] 2xl:grid-cols-[minmax(0,1.28fr)_minmax(420px,0.88fr)]">

          {/* ── Left — Task board ── */}
          <div className="space-y-4">

            {/* Filter bar */}
            <section className="rounded-[var(--app-card-radius)] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex items-center gap-3">
                <FolderKanban className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="text-sm font-black text-zinc-700 dark:text-zinc-200">Filter Tasks</span>
                {(search || categoryFilter !== "All" || teamFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All" || campaignFilter !== "All") && (
                  <button
                    onClick={() => { setSearch(""); setCategoryFilter("All"); setTeamFilter("All"); setStatusFilter("All"); setPriorityFilter("All"); setCampaignFilter("All"); }}
                    className="ml-auto text-[11px] font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.5fr,repeat(5,minmax(0,1fr))]">
                {/* Search */}
                <label className="col-span-full flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-2 xl:col-span-1">
                  <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tasks…"
                    className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>

                <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter}
                  options={[["All", "All Categories"], ...PMO_CATEGORIES.map((c): [string, string] => [c, c])]}
                />
                <FilterSelect label="Team" value={teamFilter} onChange={setTeamFilter}
                  options={[["All", "All Teams"], ...enabledTeams.map((t): [string, string] => [t.id, t.name])]}
                />
                <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}
                  options={[["All", "All Statuses"], ...TASK_STATUSES.map((s): [string, string] => [s, s])]}
                />
                <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter}
                  options={[["All", "All Priorities"], ...TASK_PRIORITIES.map((p): [string, string] => [p, p])]}
                />
                <FilterSelect label="Campaign" value={campaignFilter} onChange={setCampaignFilter}
                  options={[
                    ["All", "Any / None"],
                    ["__none__", "No campaign"],
                    ...opsCampaigns.map((c): [string, string] => [c.id, c.name]),
                  ]}
                />
              </div>

              <div className="mt-3">
                <DateRangeFilter label="Due Date Range" value={dateRange} onChange={setDateRange} />
              </div>
            </section>

            {/* Task table */}
            <section className="overflow-hidden rounded-[var(--app-card-radius)] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {filteredTasks.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full min-w-[980px]">
                    <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                      <tr>
                        {["Task", "Category", "Team / Owner", "Status", "Priority", "Due", "Campaign", ""].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {filteredTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          campaigns={opsCampaigns}
                          teamMembers={teamMembers}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => deleteTask(task.id)}
                          onStatusChange={(v) => updateField(task.id, "status", v)}
                          onPriorityChange={(v) => updateField(task.id, "priority", v)}
                          onDueDateChange={(v) => updateField(task.id, "dueDate", v)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-8 py-16 text-center">
                  <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "rgba(var(--app-primary-rgb, 0 0 0), 0.07)" }}
                  >
                    <ClipboardList className="h-6 w-6" style={{ color: "var(--app-primary, #3f3f46)" }} />
                  </div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {pmoTasks.length === 0 ? "No tasks yet" : "No tasks match the current filters"}
                  </h3>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    {pmoTasks.length === 0
                      ? "Create your first PMO task. Campaign link is optional."
                      : "Try clearing filters or adjusting the date range."}
                  </p>
                  <button
                    onClick={() => setEditingTask("new")}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "var(--app-primary, #18181b)",
                      color: "rgb(var(--app-primary-contrast-rgb, 255 255 255))",
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add PMO Task
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* ── Right — Daily Routines ── */}
          <section className="flex flex-col rounded-[var(--app-card-radius)] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {/* Routines header */}
            <div className="border-b border-zinc-100 px-6 py-6 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">Routine Layer</p>
                  <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">Daily Routines</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Personalised checklist — fully editable and per-user.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black tabular-nums text-zinc-900 dark:text-zinc-100">
                    {routinesDone}
                    <span className="text-base font-bold text-zinc-400">/{routinesTotal}</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">complete</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: "var(--app-primary, #18181b)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${routinesPercent}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Routines list */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <div className="space-y-4">
                {routines.length > 0 ? (
                  routines.map((routine, i) => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      isFirst={i === 0}
                      isLast={i === routines.length - 1}
                      onToggle={() => updateRoutine(routine.id, "completed", !routine.completed)}
                      onTitleChange={(v) => updateRoutine(routine.id, "title", v)}
                      onDescChange={(v) => updateRoutine(routine.id, "description", v)}
                      onMoveUp={() => moveRoutine(routine.id, -1)}
                      onMoveDown={() => moveRoutine(routine.id, 1)}
                      onDelete={() => deleteRoutine(routine.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
                    <p className="font-black text-zinc-900 dark:text-zinc-100">No routines yet</p>
                    <button
                      onClick={addRoutine}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: "var(--app-primary, #18181b)",
                        color: "rgb(var(--app-primary-contrast-rgb, 255 255 255))",
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add first routine
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      {/* ── PMO Task Modal ── */}
      <PMOTaskModal
        isOpen={editingTask !== null}
        task={editingTask === "new" ? null : editingTask}
        campaigns={opsCampaigns.map((c) => ({ id: c.id, name: c.name }))}
        teamMembers={teamMembers}
        onClose={() => setEditingTask(null)}
        onSave={saveTask}
      />
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

function StatTile({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: number; sub: string;
  icon: React.ElementType;
  accent: "neutral" | "amber" | "blue" | "red";
}) {
  const iconCls = {
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  }[accent];

  return (
    <div className="flex items-center gap-4 px-6 py-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--app-card-radius-sm)] ${iconCls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
        <div className="text-xl font-black tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
        <div className="mt-1 text-[11px] leading-relaxed text-zinc-400">{sub}</div>
      </div>
    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  campaigns,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
}: {
  task: PMOTask;
  campaigns: Array<{ id: string; name: string }>;
  teamMembers: Array<{ email: string; name: string; teamName?: string }>;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (v: TaskStatus) => void;
  onPriorityChange: (v: TaskPriority) => void;
  onDueDateChange: (v: string) => void;
}) {
  const team = OPERATIONS_TEAMS.find((t) => t.id === task.teamId);
  const linkedCampaign = task.linkedCampaignId ? campaigns.find((c) => c.id === task.linkedCampaignId) : null;

  const assigneeLabel =
    task.assignmentMode === "person" && task.assignedToName
      ? task.assignedToName
      : task.assignmentMode === "team" && team
      ? team.name
      : "Unassigned";

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== "Done";
  const isDueToday = task.dueDate && task.dueDate.slice(0, 10) === today;

  return (
    <tr className="group align-top text-sm transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40">
      {/* Task title + description */}
      <td className="px-5 py-4">
        <div className="max-w-[280px]">
          <div className="font-bold leading-snug text-zinc-900 dark:text-zinc-100">{task.title}</div>
          {task.description && (
            <div className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">{task.description}</div>
          )}
          {task.notes && (
            <div className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-zinc-400">
              <span className="font-bold">Note:</span> {task.notes}
            </div>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Tag className="h-2.5 w-2.5" />
          {task.category}
        </span>
      </td>

      {/* Team / Owner */}
      <td className="px-5 py-4">
        <div className="text-sm font-semibold leading-snug text-zinc-800 dark:text-zinc-200">{team?.name || task.teamId}</div>
        <div className="mt-1 text-[11px] leading-relaxed text-zinc-500">{assigneeLabel}</div>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${STATUS_STYLES[task.status]}`}>
            {task.status}
          </span>
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            className="block w-full min-w-[110px] rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </td>

      {/* Priority */}
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${PRIORITY_STYLES[task.priority]}`}>
            {task.priority}
          </span>
          <select
            value={task.priority}
            onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
            className="block w-full min-w-[100px] rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </td>

      {/* Due date */}
      <td className="px-5 py-4">
        <input
          type="date"
          value={task.dueDate || ""}
          onChange={(e) => onDueDateChange(e.target.value)}
          className={`w-full min-w-[130px] rounded-xl border px-2.5 py-1.5 text-xs outline-none ${
            isOverdue
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              : isDueToday
              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
              : "border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          }`}
        />
        {isOverdue && <div className="mt-0.5 text-[10px] font-bold text-red-500">Overdue</div>}
        {isDueToday && !isOverdue && <div className="mt-0.5 text-[10px] font-bold text-amber-500">Due today</div>}
      </td>

      {/* Campaign link */}
      <td className="px-5 py-4">
        {linkedCampaign ? (
          <span className="inline-block max-w-[220px] whitespace-normal break-words rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] font-bold leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {linkedCampaign.name}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-400">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-xl border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── RoutineCard ──────────────────────────────────────────────────────────────

function RoutineCard({
  routine, isFirst, isLast,
  onToggle, onTitleChange, onDescChange, onMoveUp, onMoveDown, onDelete,
}: {
  routine: RoutineItem; isFirst: boolean; isLast: boolean;
  onToggle: () => void;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
}) {
  const done = routine.completed;
  return (
    <div className={`rounded-[var(--app-card-radius-sm)] border p-5 transition-all duration-200 ${
      done
        ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/60"
    }`}>
      <div className="flex items-start gap-4">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
            done
              ? "border-white/30 bg-white/15 text-white dark:border-black/20 dark:bg-black/10 dark:text-black"
              : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
          }`}
        >
          {done && <CheckCircle2 className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1 space-y-3">
          <input
            value={routine.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={`w-full rounded-[var(--app-card-radius-sm)] border px-4 py-2.5 text-sm font-bold outline-none ${
              done
                ? "border-white/20 bg-white/10 text-white placeholder:text-white/40 dark:border-black/10 dark:bg-black/10 dark:text-black"
                : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            }`}
            placeholder="Routine title"
          />
          <textarea
            value={routine.description}
            onChange={(e) => onDescChange(e.target.value)}
            rows={4}
            className={`w-full resize-none rounded-[var(--app-card-radius-sm)] border px-4 py-3 text-sm leading-relaxed outline-none ${
              done
                ? "border-white/20 bg-white/10 text-white/80 placeholder:text-white/40 dark:border-black/10 dark:bg-black/10 dark:text-black/80"
                : "border-zinc-200 bg-zinc-50 text-zinc-700 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
            placeholder="Steps, criteria, or notes for this routine"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <button disabled={isFirst} onClick={onMoveUp}
            className={`rounded-lg border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
              done ? "border-white/20 text-white hover:bg-white/10 dark:border-black/20 dark:text-black"
                   : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button disabled={isLast} onClick={onMoveDown}
            className={`rounded-lg border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
              done ? "border-white/20 text-white hover:bg-white/10 dark:border-black/20 dark:text-black"
                   : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PMO Task Modal ───────────────────────────────────────────────────────────

function PMOTaskModal({
  isOpen,
  task,
  campaigns,
  teamMembers,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  task: PMOTask | null;
  campaigns: Array<{ id: string; name: string }>;
  teamMembers: Array<{ email: string; name: string; teamName?: string }>;
  onClose: () => void;
  onSave: (task: PMOTask) => void;
}) {
  const modalCtx = useContext(AppContext);
  const modalDisabledTeams: string[] = modalCtx?.disabledTeams || [];
  const modalEnabledTeams = OPERATIONS_TEAMS.filter((t) => !modalDisabledTeams.includes(t.id));

  const defaults = useMemo((): TaskFormValues => ({
    title: task?.title || "",
    description: task?.description || "",
    category: task?.category || "Execution",
    teamId: task?.teamId || (modalEnabledTeams[0]?.id ?? OPERATIONS_TEAMS[0].id),
    status: task?.status || "Pending",
    priority: task?.priority || "Medium",
    dueDate: task?.dueDate || "",
    assignmentMode: task?.assignmentMode || "unassigned",
    assigneeEmail: task?.assignedToEmail || "",
    notes: task?.notes || "",
    linkedCampaignId: task?.linkedCampaignId || "",
  }), [task]);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<TaskFormValues>({ values: defaults });

  useEffect(() => {
    if (isOpen) reset(defaults);
  }, [isOpen, defaults, reset]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const assignmentMode = watch("assignmentMode");
  const selectedTeamId = watch("teamId");

  const submit = handleSubmit((values) => {
    const assignee = teamMembers.find((m) => m.email === values.assigneeEmail);
    const now = new Date().toISOString();
    const saved: PMOTask = {
      id: task?.id || uid("pmo"),
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      teamId: values.teamId,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate,
      assignmentMode: values.assignmentMode,
      assignedToName: values.assignmentMode === "person" ? assignee?.name || "" : "",
      assignedToEmail: values.assignmentMode === "person" ? values.assigneeEmail : "",
      notes: values.notes.trim(),
      linkedCampaignId: values.linkedCampaignId || null,
      createdAt: task?.createdAt || now,
      updatedAt: now,
    };
    onSave(saved);
  });

  const fieldCls = "mt-2 w-full rounded-[var(--app-card-radius-sm)] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="mx-auto my-4 flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-[var(--app-card-radius)] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {task ? "Edit PMO Task" : "New PMO Task"}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {task ? "Update task details, status, or reassign." : "Create a task manually. Campaign link is optional."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6" style={{ maxHeight: "calc(100vh - 14rem)" }}>

                {/* Title */}
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Task Title <span className="text-red-500">*</span>
                  <input
                    {...register("title", { required: "Title is required" })}
                    className={fieldCls}
                    placeholder="What needs to be done?"
                    autoFocus
                  />
                  {errors.title && (
                    <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.title.message}</p>
                  )}
                </label>

                {/* Category + Team */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Category
                    <select {...register("category")} className={fieldCls}>
                      {PMO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Team
                    <select {...register("teamId")} className={fieldCls}>
                      {modalEnabledTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </label>
                </div>

                {/* Description */}
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Description
                  <textarea {...register("description")} rows={3} className={fieldCls} placeholder="Context, scope, or deliverable detail" />
                </label>

                {/* Status + Priority + Due */}
                <div className="grid gap-5 sm:grid-cols-3">
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Status
                    <select {...register("status")} className={fieldCls}>
                      {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Priority
                    <select {...register("priority")} className={fieldCls}>
                      {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Due Date
                    <input type="date" {...register("dueDate")} className={fieldCls} />
                  </label>
                </div>

                {/* Assignment */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Assignment
                    <select {...register("assignmentMode")} className={fieldCls}>
                      <option value="unassigned">Unassigned</option>
                      <option value="team">Assign to Team</option>
                      <option value="person">Assign to Person</option>
                    </select>
                  </label>

                  {assignmentMode === "person" ? (
                    <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                      Person
                      <select {...register("assigneeEmail")} className={fieldCls}>
                        <option value="">Select member</option>
                        {teamMembers.map((m) => (
                          <option key={m.email} value={m.email}>
                            {m.name}{m.teamName ? ` — ${m.teamName}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : assignmentMode === "team" ? (
                    <div className="flex items-end">
                      <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                        Assigned to <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {OPERATIONS_TEAMS.find((t) => t.id === selectedTeamId)?.name}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Notes */}
                <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Notes / Blockers
                  <textarea {...register("notes")} rows={3} className={fieldCls} placeholder="Dependencies, blockers, escalation path…" />
                </label>

                {/* Campaign link (optional) */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                    Campaign Link <span className="normal-case tracking-normal font-normal text-zinc-400">— optional</span>
                  </p>
                  <select
                    {...register("linkedCampaignId")}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">No campaign (standalone)</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Links this task to a campaign for reference only. The task stays in your PMO tracker.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-[11px] text-zinc-400">
                  <span className="text-red-500">*</span> required
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: "var(--app-primary, #18181b)",
                      color: "rgb(var(--app-primary-contrast-rgb, 255 255 255))",
                    }}
                  >
                    <Save className="h-4 w-4" />
                    {task ? "Update Task" : "Create Task"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
