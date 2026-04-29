import React, { useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from './Root';
import { Bell, CheckCircle2, Clock, AlertCircle, Trophy, X, ClipboardList, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  dismissedIds: Set<string>;
  onDismiss: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface Notification {
  id: string;
  type: 'task_done' | 'task_overdue' | 'task_blocked' | 'success' | 'task_new';
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
}

type NotificationTask = {
  id: string | number;
  status?: string;
  startDateTime?: string;
  endDateTime?: string;
  slaHrs?: number;
  campaign?: string;
  assignedTo?: string;
};

type SuccessLog = {
  id?: string | number;
  title?: string;
  agent?: string;
  detail?: string;
  time?: string;
};

type TaskNotificationRecord = {
  id: string;
  assignedTo?: string;
  taskName?: string;
  taskDescription?: string;
  time?: string;
  date?: string;
};

const EMPTY_TASKS: NotificationTask[] = [];
const EMPTY_SUCCESS_LOGS: SuccessLog[] = [];
const EMPTY_TASK_NOTIFICATIONS: TaskNotificationRecord[] = [];

export function NotificationPanel({ isOpen, onClose, triggerRef, dismissedIds, onDismiss }: NotificationPanelProps) {
  const ctx = useContext(AppContext);
  const tasks = (ctx?.operationalTasks?.length
    ? ctx.operationalTasks
    : ctx?.tasks) as NotificationTask[] | undefined ?? EMPTY_TASKS;
  const successLogs = (ctx?.successLogs as SuccessLog[] | undefined) ?? EMPTY_SUCCESS_LOGS;
  const taskNotifications = (ctx?.taskNotifications as TaskNotificationRecord[] | undefined) ?? EMPTY_TASK_NOTIFICATIONS;
  const userEmail = ctx?.userEmail || '';
  const panelRef = useRef<HTMLDivElement>(null);
  const dismissed = dismissedIds;
  const setDismissed = onDismiss;

  // Close on outside click / Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef?.current?.contains(target)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  const allNotifications = useMemo<Notification[]>(() => {
    const notifs: Notification[] = [];

    successLogs.slice(0, 3).forEach((log) => {
      notifs.push({
        id: `success-${log.id}`,
        type: 'success',
        title: `${log.title || log.agent || 'Team'} logged an update`,
        description: log.detail?.substring(0, 80) || 'Success recorded',
        time: log.time || 'Recently',
        icon: Trophy,
      });
    });

    tasks.filter((t) => {
      if (t.status === 'Done' || !t.startDateTime) return false;
      const aging = (Date.now() - new Date(t.startDateTime).getTime()) / 3_600_000;
      return aging > Number(t.slaHrs || 0);
    }).slice(0, 3).forEach((t) => {
      notifs.push({
        id: `overdue-${t.id}`,
        type: 'task_overdue',
        title: 'SLA Breach',
        description: `${t.campaign} — ${t.assignedTo || 'unassigned'}`,
        time: 'Overdue',
        icon: AlertCircle,
      });
    });

    tasks.filter((t) => t.status === 'Done' && t.endDateTime)
      .sort((a, b) => new Date(b.endDateTime || 0).getTime() - new Date(a.endDateTime || 0).getTime())
      .slice(0, 3).forEach((t) => {
        notifs.push({
          id: `done-${t.id}`,
          type: 'task_done',
          title: 'Task Completed',
          description: `${t.campaign} by ${t.assignedTo || 'unknown'}`,
          time: new Date(t.endDateTime || 0).toLocaleDateString(),
          icon: CheckCircle2,
        });
      });

    tasks.filter((t) => t.status === 'Blocked').slice(0, 2).forEach((t) => {
      notifs.push({
        id: `blocked-${t.id}`,
        type: 'task_blocked',
        title: 'Task Blocked',
        description: `${t.campaign} — ${t.assignedTo || 'unassigned'}`,
        time: 'Needs attention',
        icon: AlertCircle,
      });
    });

    taskNotifications
      .filter((n) => n.assignedTo?.toLowerCase() === userEmail.toLowerCase())
      .slice(0, 5)
      .forEach((n) => {
        notifs.push({
          id: n.id,
          type: 'task_new',
          title: 'New Task Assigned',
          description: `${n.taskName} — ${n.taskDescription?.substring(0, 60) || 'No description'}`,
          time: n.time || n.date || 'Recently',
          icon: ClipboardList,
        });
      });

    return notifs.slice(0, 12);
  }, [tasks, successLogs, taskNotifications, userEmail]);

  const visible = useMemo(
    () => allNotifications.filter((n) => !dismissed.has(n.id)),
    [allNotifications, dismissed],
  );

  const dismiss = (id: string) => setDismissed((prev) => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(allNotifications.map((n) => n.id)));

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Notifications</h3>
          {visible.length > 0 && (
            <span className="px-2 py-0.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black rounded-full">
              {visible.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {visible.length > 0 && (
            <button
              onClick={dismissAll}
              title="Mark all as read"
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[26rem] overflow-y-auto">
        {visible.length > 0 ? (
          visible.map((notif) => {
            const Icon = notif.icon;
            return (
              <div
                key={notif.id}
                className="group flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-b-0"
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                  notif.type === 'task_overdue' || notif.type === 'task_blocked'
                    ? 'bg-zinc-900 dark:bg-zinc-200 text-white dark:text-black'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{notif.title}</p>
                    <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap shrink-0">{notif.time}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{notif.description}</p>
                </div>
                <button
                  onClick={() => dismiss(notif.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">All caught up</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">No new notifications</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {visible.length > 0 && (
        <div className="px-5 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {visible.length} active
          </p>
          <button
            onClick={dismissAll}
            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
