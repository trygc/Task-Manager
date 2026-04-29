import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Cloud,
  CloudOff,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Upload,
  WifiOff,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NotificationPanel } from './NotificationPanel';
import { useNavigate } from '../lib/routerCompat';
import { cn } from '@/lib/utils';

const LazySOPModal = React.lazy(() =>
  import('./SOPModal').then((module) => ({ default: module.SOPModal })),
);

interface TopBarProps {
  connectionState: 'idle' | 'loading' | 'online' | 'syncing' | 'error';
  currentPageDescription: string;
  currentPageLabel: string;
  lastSyncError: string | null;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
  onRefreshWorkspace: () => void;
  onOpenUpload: () => void;
  onOpenSuccess: () => void;
  unreadCount: number;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  dismissedNotifIds: Set<string>;
  onDismissNotifs: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function initials(value: string) {
  return (value || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-zinc-800 text-zinc-100',
    'bg-zinc-700 text-zinc-100',
    'bg-zinc-600 text-zinc-100',
    'bg-zinc-900 text-zinc-100',
  ];
  const index = (name || 'U').charCodeAt(0) % colors.length;
  return colors[index];
}

export function TopBar({
  connectionState,
  currentPageDescription,
  currentPageLabel,
  lastSyncError,
  onOpenCommandPalette,
  onOpenMobileMenu,
  userName,
  userEmail,
  isAdmin,
  onLogout,
  onRefreshWorkspace,
  onOpenUpload,
  onOpenSuccess,
  unreadCount,
  saveState,
  lastSaved,
  dismissedNotifIds,
  onDismissNotifs,
}: TopBarProps) {
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSOPOpen, setIsSOPOpen] = useState(false);
  const notifButtonRef = useRef<HTMLButtonElement | null>(null);

  const connectionLabel = useMemo(() => {
    if (saveState === 'saving') return 'Saving…';
    if (saveState === 'error') return lastSyncError ? 'Sync failed' : 'Sync failed';
    if (saveState === 'saved' && lastSaved) {
      return `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (connectionState === 'loading') return 'Loading…';
    if (connectionState === 'error') return 'Offline';
    return 'Up to date';
  }, [connectionState, lastSaved, lastSyncError, saveState]);

  const connectionTooltip = useMemo(() => {
    if (lastSyncError) return lastSyncError;
    if (saveState === 'saved' && lastSaved) return `Last saved at ${lastSaved.toLocaleTimeString()}`;
    return undefined;
  }, [lastSaved, lastSyncError, saveState]);

  const SaveIcon =
    saveState === 'saving' ? Loader2 :
    saveState === 'saved' ? CheckCircle2 :
    saveState === 'error' ? CloudOff :
    connectionState === 'error' ? WifiOff :
    Cloud;

  const statusTone =
    connectionState === 'error' || saveState === 'error'
      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : saveState === 'saved'
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      : saveState === 'saving'
      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';

  return (
    <>
      <header
        className="app-topbar-gradient sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95"
        style={{ paddingInline: 'var(--app-topbar-padding-x)' }}
      >
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            {currentPageLabel}
          </div>
          <div className="hidden lg:block text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {currentPageDescription}
          </div>
        </div>

        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors w-64"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        <div className="hidden lg:flex items-center gap-2">
          <span
            className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors', statusTone)}
            title={connectionTooltip}
          >
            <SaveIcon className={cn('w-3.5 h-3.5', saveState === 'saving' && 'animate-spin')} />
            {connectionLabel}
          </span>

          <button
            onClick={onRefreshWorkspace}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSOPOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium"
          >
            SOP
          </button>

          <button
            onClick={onOpenSuccess}
            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-medium"
          >
            Add Update
          </button>

          {isAdmin && (
            <button
              onClick={onOpenUpload}
              className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          )}
        </div>

        <ThemeToggle />

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={notifButtonRef}
            onClick={() => setIsNotifOpen((current) => !current)}
            className="relative p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationPanel
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            triggerRef={notifButtonRef}
            dismissedIds={dismissedNotifIds}
            onDismiss={onDismissNotifs}
          />
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((current) => !current)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold', getAvatarColor(userName || userEmail))}>
              {initials(userName || userEmail)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50 leading-none">
                {(userName || userEmail).split(' ')[0]}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-none mt-0.5 capitalize">
                {isAdmin ? 'admin' : 'member'}
              </p>
            </div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isUserMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 py-1">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{userName || userEmail}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{userEmail}</p>
                  <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {isAdmin ? 'Admin' : 'Member'}
                  </span>
                </div>
                <MenuButton
                  icon={Settings}
                  label="Settings"
                  onClick={() => { navigate('/settings'); setIsUserMenuOpen(false); }}
                />
                <MenuButton
                  icon={ClipboardList}
                  label="SOP & Roles"
                  onClick={() => { setIsSOPOpen(true); setIsUserMenuOpen(false); }}
                  className="lg:hidden"
                />
                {isAdmin && (
                  <MenuButton
                    icon={Upload}
                    label="Upload"
                    onClick={() => { onOpenUpload(); setIsUserMenuOpen(false); }}
                    className="lg:hidden"
                  />
                )}
                <MenuButton
                  label="Add Update"
                  onClick={() => { onOpenSuccess(); setIsUserMenuOpen(false); }}
                  className="lg:hidden"
                />
                <MenuButton
                  label="Refresh workspace"
                  onClick={() => { onRefreshWorkspace(); setIsUserMenuOpen(false); }}
                  className="lg:hidden"
                />
                <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <MenuButton
                  icon={LogOut}
                  label="Sign out"
                  onClick={() => { onLogout(); setIsUserMenuOpen(false); }}
                  danger
                />
              </div>
            </>
          )}
        </div>
      </header>

      {isSOPOpen && (
        <React.Suspense fallback={null}>
          <LazySOPModal isOpen={isSOPOpen} onClose={() => setIsSOPOpen(false)} />
        </React.Suspense>
      )}
    </>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
  className,
}: {
  icon?: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2',
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
        className,
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}
