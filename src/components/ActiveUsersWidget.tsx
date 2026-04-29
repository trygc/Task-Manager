import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Users } from 'lucide-react';
import { supabase } from './supabaseClient';
import { cn } from '@/lib/utils';

interface PresenceUser {
  user_id: string;
  email: string;
  name: string;
  online_at: string;
}

type PresenceRecord = PresenceUser & { presence_ref: string };

function normalizePresenceUsers(records: PresenceRecord[]): PresenceUser[] {
  const map = new Map<string, PresenceUser>();
  for (const record of records) {
    if (!record.email) continue;
    const { presence_ref, ...user } = record;
    map.set(user.email, user);
  }
  return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
}

function sameUsers(a: PresenceUser[], b: PresenceUser[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].email !== b[i].email ||
      a[i].name !== b[i].name ||
      a[i].user_id !== b[i].user_id ||
      a[i].online_at !== b[i].online_at
    ) {
      return false;
    }
  }
  return true;
}

interface ActiveUsersWidgetProps {
  userEmail: string;
  userName: string;
}

export function ActiveUsersWidget({ userEmail, userName }: ActiveUsersWidgetProps) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const connectedRef = useRef(false);

  const trackSelf = useCallback(async () => {
    const ch = channelRef.current;
    if (!ch || !connectedRef.current) return;
    try {
      await ch.track({
        user_id: userEmail,
        email: userEmail,
        name: userName || userEmail,
        online_at: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  }, [userEmail, userName]);

  useEffect(() => {
    if (!userEmail) return;

    const channel = supabase.channel('platform-presence', {
      config: { presence: { key: userEmail }, broadcast: { self: true } },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users = normalizePresenceUsers(
          Object.values(state).flat().filter((u): u is PresenceRecord => !!u.email),
        );
        setActiveUsers((prev) => (sameUsers(prev, users) ? prev : users));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const incoming = normalizePresenceUsers(newPresences as PresenceRecord[]);
        setActiveUsers((prev) => {
          if (incoming.length === 0) return prev;
          const merged = normalizePresenceUsers([
            ...prev.map((u) => ({ ...u, presence_ref: u.email })),
            ...incoming.map((u) => ({ ...u, presence_ref: u.email })),
          ]);
          return sameUsers(prev, merged) ? prev : merged;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftEmails = new Set(
          normalizePresenceUsers(leftPresences as PresenceRecord[]).map((u) => u.email),
        );
        setActiveUsers((prev) => prev.filter((u) => !leftEmails.has(u.email)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          connectedRef.current = true;
          setConnected(true);
          await channel.track({
            user_id: userEmail,
            email: userEmail,
            name: userName || userEmail,
            online_at: new Date().toISOString(),
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          connectedRef.current = false;
          setConnected(false);
        } else {
          connectedRef.current = false;
          setConnected(false);
        }
      });

    // Re-track presence every 30 s to survive reconnects and keep online_at fresh
    const heartbeat = window.setInterval(() => void trackSelf(), 30_000);

    return () => {
      window.clearInterval(heartbeat);
      connectedRef.current = false;
      channel.untrack().catch(() => undefined).finally(() => {
        void supabase.removeChannel(channel);
      });
    };
  }, [userEmail, userName, trackSelf]);

  const count = activeUsers.length;

  return (
    <div className="rounded-[var(--app-card-radius)] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Live Active Users
        </span>
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Connecting…</span>
            </>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="flex items-end gap-3 mb-4">
        <motion.div
          key={count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-5xl font-black text-zinc-900 dark:text-zinc-50 leading-none"
        >
          {count}
        </motion.div>
        <div className="pb-1">
          <div className="text-[11px] font-black uppercase tracking-widest text-zinc-400 leading-tight">
            {count === 1 ? 'user' : 'users'}
          </div>
          <div className="text-[11px] font-medium text-zinc-400 leading-tight">online now</div>
        </div>
      </div>

      {/* User list */}
      <div className="space-y-1.5">
        {activeUsers.length > 0 ? (
          activeUsers.map((user) => (
            <motion.div
              key={user.email}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-zinc-50 dark:bg-zinc-900"
            >
              {/* Avatar initials */}
              <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase">
                  {(user.name || user.email).charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                  {user.name || user.email}
                </div>
                {user.name && (
                  <div className="text-[10px] text-zinc-400 truncate">{user.email}</div>
                )}
              </div>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            </motion.div>
          ))
        ) : (
          <div className={cn('flex flex-col items-center justify-center py-6 text-zinc-400', !connected && 'opacity-50')}>
            <Radio className="w-7 h-7 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">{connected ? 'No users online yet' : 'Connecting to presence…'}</p>
          </div>
        )}
        {activeUsers.length === 1 && activeUsers[0].email === userEmail && connected && (
          <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 pt-1">
            You're the only one online right now
          </p>
        )}
      </div>
    </div>
  );
}
