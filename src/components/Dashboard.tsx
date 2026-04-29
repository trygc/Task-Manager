import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from './Root';
import { useNavigate } from '../lib/routerCompat';
import { isTaskAssignedToUser } from '../lib/operations';
import { DateRangeFilter } from './DateRangeFilter';
import { emptyDateRange, filterByDateRange } from '../lib/dateFilters';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle2,
  Target,
  AlertCircle,
  Users,
  Calendar,
  ArrowRight,
  Activity,
  Award,
  Zap,
  BarChart3,
  ChevronRight,
  Flame,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveUsersWidget } from './ActiveUsersWidget';

const EASE = [0.22, 1, 0.36, 1] as const;
const NOW_MS = 1000 * 60 * 60;

type TaskLike = {
  id?: string | number;
  campaign?: string;
  title?: string;
  status?: string;
  assignedTo?: string;
  metricCON?: number;
  metricTarget?: number;
  slaHrs?: number;
  startDateTime?: string;
  endDateTime?: string;
  createdAt?: string;
};

type SuccessLike = {
  id?: string;
  agent?: string;
  detail?: string;
  time?: string;
  timestamp?: string;
  createdAt?: string;
  date?: string;
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } } },
};

export function Dashboard() {
  const ctx = useContext(AppContext);
  const tasks = (ctx?.operationalTasks?.length ? ctx.operationalTasks : ctx?.tasks || []) as TaskLike[];
  const successLogs = (ctx?.successLogs || []) as SuccessLike[];
  const userName = ctx?.userName || '';
  const userEmail = ctx?.userEmail || '';
  const isAdmin = ctx?.isAdmin || false;
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(emptyDateRange);

  const toMs = (value?: string) => {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const myTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter((t: any) => isTaskAssignedToUser(t, { userEmail, userName }));
  }, [tasks, isAdmin, userName, userEmail]);

  const filteredTasks = useMemo(
    () => filterByDateRange(myTasks, dateRange, (task: TaskLike) => task.endDateTime || task.startDateTime || task.createdAt),
    [dateRange, myTasks],
  );

  const filteredSuccesses = useMemo(
    () => filterByDateRange(successLogs, dateRange, (log: SuccessLike) => log.timestamp || log.createdAt || log.date),
    [dateRange, successLogs],
  );

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    let done = 0;
    let inProgress = 0;
    let blocked = 0;
    let overdue = 0;
    let totalCON = 0;
    let totalTarget = 0;

    const now = Date.now();
    for (const task of filteredTasks as TaskLike[]) {
      const status = task.status || '';
      if (status === 'Done') done += 1;
      if (status === 'In Progress') inProgress += 1;
      if (status === 'Blocked') blocked += 1;

      totalCON += task.metricCON || 0;
      totalTarget += task.metricTarget || 0;

      if (status !== 'Done' && (task.slaHrs || 0) > 0) {
        const startMs = toMs(task.startDateTime);
        const endMs = toMs(task.endDateTime) || now;
        const agingHrs = (endMs - startMs) / NOW_MS;
        if (startMs > 0 && agingHrs > (task.slaHrs || 0)) overdue += 1;
      }
    }

    const achievementRate = totalTarget > 0 ? Math.min(Math.round((totalCON / totalTarget) * 100), 100) : 0;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, blocked, overdue, totalCON, totalTarget, achievementRate, completionRate };
  }, [filteredTasks]);

  const recentTasks = useMemo(() => {
    return [...filteredTasks]
      .sort((a: TaskLike, b: TaskLike) => new Date(b.startDateTime || b.createdAt || 0).getTime() - new Date(a.startDateTime || a.createdAt || 0).getTime())
      .slice(0, 6);
  }, [filteredTasks]);

  const recentSuccesses = useMemo(() => filteredSuccesses.slice(0, 5), [filteredSuccesses]);

  const teamPerformance = useMemo(() => {
    if (!isAdmin) return [];
    const byAgent = new Map<string, { total: number; done: number }>();
    for (const task of filteredTasks as TaskLike[]) {
      const name = task.assignedTo;
      if (!name) continue;
      const prev = byAgent.get(name) || { total: 0, done: 0 };
      prev.total += 1;
      if (task.status === 'Done') prev.done += 1;
      byAgent.set(name, prev);
    }

    return Array.from(byAgent.entries())
      .map(([name, counts]) => ({
        name,
        total: counts.total,
        done: counts.done,
        score: counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [filteredTasks, isAdmin]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = (userName || userEmail).split(' ')[0] || 'there';

  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Hero Header */}
      <motion.div variants={stagger.item}>
        <div className="relative overflow-hidden rounded-[var(--app-card-radius)] bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 p-6 md:p-8">
          {/* Subtle grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          {/* Glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">{greeting}</p>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {displayName}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-zinc-400">
                {isAdmin
                  ? `${stats.total} tasks across the team · ${stats.overdue > 0 ? `${stats.overdue} overdue` : 'all on track'}`
                  : `${stats.total} tasks assigned · ${stats.completionRate}% completion rate`}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              {stats.overdue > 0 && (
                <div className="rounded-xl border border-red-800/50 bg-red-900/30 px-3 py-2 text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {stats.overdue} overdue
                </div>
              )}
            </div>
          </div>

          {/* Mini progress bar */}
          {stats.total > 0 && (
            <div className="relative mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Team Progress</span>
                <span className="text-[11px] font-black text-zinc-300">{stats.completionRate}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.completionRate}%` }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Date Filter */}
      <motion.div variants={stagger.item}>
        <DateRangeFilter label="Date Range" value={dateRange} onChange={setDateRange} />
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={stagger.item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Tasks"
          value={stats.total}
          icon={ClipboardList}
          sub={`${stats.completionRate}% done`}
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <StatCard
          label="Completed"
          value={stats.done}
          icon={CheckCircle2}
          sub="finished"
          accent
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={Activity}
          sub="active now"
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          sub={stats.overdue > 0 ? 'needs attention' : 'all on track'}
          danger={stats.overdue > 0}
          onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
        />
      </motion.div>

      {/* Active Users Widget — admin only */}
      {isAdmin && (
        <motion.div variants={stagger.item}>
          <ActiveUsersWidget userEmail={userEmail} userName={userName} />
        </motion.div>
      )}

      {/* Middle Row */}
      <motion.div variants={stagger.item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Achievement */}
        <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Achievement</span>
            <Target className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-4xl font-black text-zinc-900 dark:text-zinc-50 mb-1">{stats.achievementRate}%</div>
          <p className="text-xs font-medium text-zinc-500 mb-4">Target vs CON</p>
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.achievementRate}%` }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3">
              <div className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">CON</div>
              <div className="text-lg font-black text-zinc-800 dark:text-zinc-100">{stats.totalCON.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3">
              <div className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">Target</div>
              <div className="text-lg font-black text-zinc-800 dark:text-zinc-100">{stats.totalTarget.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Quick Actions</span>
            <Zap className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="space-y-2">
            <ActionRow label="View All Tasks" to={isAdmin ? '/tasks' : '/personal'} navigate={navigate} primary />
            {isAdmin && (
              <>
                <ActionRow label="Team Analytics" to="/analytics" navigate={navigate} />
                <ActionRow label="Member Views" to="/member-views" navigate={navigate} />
              </>
            )}
            <ActionRow label="Successes Feed" to="/successes" navigate={navigate} />
            {isAdmin && <ActionRow label="Coverage Board" to="/coverage" navigate={navigate} />}
          </div>
        </div>

        {/* Blocked / Status breakdown */}
        <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Status Breakdown</span>
            <BarChart3 className="w-4 h-4 text-zinc-400" />
          </div>
          {stats.total > 0 ? (
            <div className="space-y-3">
              {[
                { label: 'Done', value: stats.done, total: stats.total, color: 'bg-zinc-900 dark:bg-zinc-100' },
                { label: 'In Progress', value: stats.inProgress, total: stats.total, color: 'bg-zinc-500' },
                { label: 'Blocked', value: stats.blocked, total: stats.total, color: 'bg-zinc-300 dark:bg-zinc-600' },
                { label: 'Overdue', value: stats.overdue, total: stats.total, color: 'bg-red-500' },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{label}</span>
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{value}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
                      transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
                      className={cn('h-full rounded-full', color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
              <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium">No data yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={stagger.item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tasks */}
        <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Recent Tasks</span>
            <button
              onClick={() => navigate(isAdmin ? '/tasks' : '/personal')}
              className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentTasks.length > 0 ? (
              recentTasks.map((task: TaskLike) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer group"
                >
                  <StatusDot status={task.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{task.campaign || task.title || 'Untitled'}</div>
                    <div className="text-xs text-zinc-500 truncate">{task.assignedTo || 'Unassigned'}</div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))
            ) : (
              <EmptyState icon={ClipboardList} message="No tasks yet" />
            )}
          </div>
        </div>

        {/* Team Performance (admin) or Recent Successes (member) */}
        {isAdmin ? (
          <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Top Performers</span>
              <button
                onClick={() => navigate('/analytics')}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Analytics <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {teamPerformance.length > 0 ? (
                teamPerformance.map((member, idx) => (
                  <div key={member.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                      idx === 0 ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' :
                      idx === 1 ? 'bg-zinc-600 text-white' :
                      idx === 2 ? 'bg-zinc-400 text-white' :
                      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    )}>
                      {idx === 0 ? <Flame className="w-3.5 h-3.5" /> : `#${idx + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{member.name}</div>
                      <div className="text-xs text-zinc-500">{member.done}/{member.total} tasks</div>
                    </div>
                    <div className="text-sm font-black text-zinc-800 dark:text-zinc-100">{member.score}%</div>
                  </div>
                ))
              ) : (
                <EmptyState icon={Users} message="No team data yet" />
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Recent Successes</span>
              <button
                onClick={() => navigate('/successes')}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {recentSuccesses.length > 0 ? (
                recentSuccesses.map((success: SuccessLike) => (
                  <div key={success.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Star className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{success.agent}</div>
                      <div className="text-xs text-zinc-500 truncate-2">{success.detail}</div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 whitespace-nowrap mt-0.5">{success.time}</span>
                  </div>
                ))
              ) : (
                <EmptyState icon={Award} message="No successes logged yet" />
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, sub, accent, danger, onClick }: {
  label: string; value: number; icon: any; sub: string;
  accent?: boolean; danger?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative rounded-[var(--app-card-radius)] border p-4 md:p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
        danger && value > 0
          ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20'
          : accent
          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center',
          danger && value > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
          accent ? 'bg-white/20 text-white dark:text-zinc-900' :
          'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <ChevronRight className={cn(
          'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity',
          accent ? 'text-white/60 dark:text-zinc-900/60' : 'text-zinc-400'
        )} />
      </div>
      <div className={cn(
        'text-3xl font-black mb-0.5',
        danger && value > 0 ? 'text-red-600 dark:text-red-400' :
        accent ? 'text-white dark:text-zinc-900' :
        'text-zinc-900 dark:text-zinc-50'
      )}>
        {value}
      </div>
      <div className={cn(
        'text-[11px] font-black uppercase tracking-wider mb-0.5',
        accent ? 'text-white/70 dark:text-zinc-900/70' : 'text-zinc-400'
      )}>
        {label}
      </div>
      <div className={cn(
        'text-[11px] font-medium',
        accent ? 'text-white/50 dark:text-zinc-900/50' : 'text-zinc-400'
      )}>
        {sub}
      </div>
    </button>
  );
}

function ActionRow({ label, to, navigate, primary }: { label: string; to: string; navigate: any; primary?: boolean }) {
  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all group',
        primary
          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      )}
    >
      {label}
      <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <div className={cn(
      'w-2 h-2 rounded-full shrink-0',
      status === 'Done' ? 'bg-zinc-900 dark:bg-zinc-100' :
      status === 'In Progress' ? 'bg-zinc-500' :
      status === 'Blocked' ? 'bg-red-500' :
      'bg-zinc-300 dark:bg-zinc-600'
    )} />
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[10px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap',
      status === 'Done' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300' :
      status === 'In Progress' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' :
      status === 'Blocked' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
      'bg-zinc-50 dark:bg-zinc-900 text-zinc-400'
    )}>
      {status}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
      <Icon className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}
