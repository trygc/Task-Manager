import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineSyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  syncInterval?: number;
  storageKey?: string;
}

export interface OfflineSyncResult {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  queueAction: (type: string, payload: any, maxRetries?: number) => void;
  clearQueue: () => void;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncErrors: string[];
}

const DEFAULT_OPTIONS: Required<OfflineSyncOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  syncInterval: 30000, // 30 seconds
  storageKey: 'trygc-offline-actions',
};

export function useOfflineSync(
  syncFunction: (actions: OfflineAction[]) => Promise<void>,
  options: OfflineSyncOptions = {}
): OfflineSyncResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const syncFunctionRef = useRef(syncFunction);
  
  // Update sync function ref when it changes
  useEffect(() => {
    syncFunctionRef.current = syncFunction;
  }, [syncFunction]);

  // Load pending actions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(opts.storageKey);
      if (stored) {
        const actions = JSON.parse(stored) as OfflineAction[];
        setPendingActions(actions);
        logger.info('Loaded offline actions from storage', { count: actions.length });
      }
    } catch (error) {
      logger.error('Failed to load offline actions from storage', error as Error);
    }
  }, [opts.storageKey]);

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(opts.storageKey, JSON.stringify(pendingActions));
    } catch (error) {
      logger.error('Failed to save offline actions to storage', error as Error);
    }
  }, [pendingActions, opts.storageKey]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Connection restored, attempting to sync offline actions');
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.info('Connection lost, entering offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up periodic sync when online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        syncNow();
      }, opts.syncInterval);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = undefined;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, pendingActions.length, opts.syncInterval]);

  const queueAction = useCallback((type: string, payload: any, maxRetries = opts.maxRetries) => {
    const action: OfflineAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    setPendingActions(prev => [...prev, action]);
    
    logger.info('Queued offline action', { 
      actionId: action.id, 
      type, 
      isOnline,
    });

    // If online, try to sync immediately
    if (isOnline) {
      setTimeout(() => syncNow(), 100);
    }
  }, [isOnline, opts.maxRetries]);

  const syncNow = useCallback(async () => {
    if (isSyncing || pendingActions.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncErrors([]);

    try {
      logger.info('Starting offline sync', { actionCount: pendingActions.length });
      
      await syncFunctionRef.current(pendingActions);
      
      // If sync was successful, clear all actions
      setPendingActions([]);
      setLastSyncTime(new Date());
      
      logger.info('Offline sync completed successfully', { 
        syncedActions: pendingActions.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      
      logger.error('Offline sync failed', error as Error, {
        actionCount: pendingActions.length,
      });

      setSyncErrors(prev => [...prev, errorMessage]);

      // Increment retry count for all actions and remove those that exceeded max retries
      setPendingActions(prev => 
        prev
          .map(action => ({ ...action, retryCount: action.retryCount + 1 }))
          .filter(action => {
            if (action.retryCount >= action.maxRetries) {
              logger.warn('Dropping offline action after max retries', {
                actionId: action.id,
                type: action.type,
                retryCount: action.retryCount,
                maxRetries: action.maxRetries,
              });
              return false;
            }
            return true;
          })
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, pendingActions]);

  const clearQueue = useCallback(() => {
    setPendingActions([]);
    setSyncErrors([]);
    logger.info('Cleared offline action queue');
  }, []);

  return {
    isOnline,
    pendingActions,
    queueAction,
    clearQueue,
    syncNow,
    isSyncing,
    lastSyncTime,
    syncErrors,
  };
}

// Hook for detecting network status changes
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}