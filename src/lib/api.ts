import { validateEnvVars } from '@/lib/validation';
import { logger, PerformanceMonitor } from '@/lib/logger';

// Validate environment variables at startup
validateEnvVars();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Extract project ID from URL for API endpoint
const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
const API_BASE_URL = `${supabaseUrl}/functions/v1/make-server-b626472b`;

interface ApiRequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  signal?: AbortSignal;
  retries?: number;
  retryDelay?: number;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiRequest<T>(
  path: string,
  { body, headers, method = "GET", signal, retries = 3, retryDelay = 1000 }: ApiRequestOptions = {},
): Promise<T> {
  const requestId = `${method}_${path}_${Date.now()}`;
  let lastError: Error;

  logger.debug(`API Request: ${method} ${path}`, { 
    requestId, 
    hasBody: !!body,
    retries,
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await PerformanceMonitor.measureAsync(
        `api_${method.toLowerCase()}_${path.replace(/\//g, '_')}`,
        async () => {
          return fetch(`${API_BASE_URL}/${path}`, {
            method,
            signal,
            headers: {
              Authorization: `Bearer ${supabaseAnonKey}`,
              ...(body ? { "Content-Type": "application/json" } : {}),
              ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
          });
        },
        { requestId, attempt: attempt + 1 }
      );

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        const error = new Error(payload?.error || `Request failed with status ${response.status}`);
        
        logger.apiError(`${method} ${path}`, error, {
          requestId,
          attempt: attempt + 1,
          status: response.status,
          statusText: response.statusText,
          payload,
        });
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw error;
        }
        
        lastError = error;
        
        // If this is the last attempt, throw the error
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delayMs = retryDelay * Math.pow(2, attempt);
        logger.debug(`Retrying API request in ${delayMs}ms`, { requestId, attempt: attempt + 1 });
        await delay(delayMs);
        continue;
      }

      logger.debug(`API Request successful: ${method} ${path}`, { 
        requestId, 
        attempt: attempt + 1,
        status: response.status,
      });

      return payload as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      logger.apiError(`${method} ${path}`, lastError, {
        requestId,
        attempt: attempt + 1,
        isNetworkError: !navigator.onLine,
        wasAborted: signal?.aborted,
      });
      
      // Don't retry on network errors if signal is aborted
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw lastError;
      }
      
      // Wait before retrying
      const delayMs = retryDelay * Math.pow(2, attempt);
      logger.debug(`Retrying API request in ${delayMs}ms`, { requestId, attempt: attempt + 1 });
      await delay(delayMs);
    }
  }

  throw lastError!;
}

export type WorkspaceDataResponse = {
  tasks?: TaskRecord[];
  successLogs?: SuccessRecord[];
  taskNotifications?: NotificationRecord[];
  mistakes?: MistakeRecord[];
  tasksPerTeam?: Record<string, WorkspaceRecord>;
  opsCampaigns?: OpsCampaignRecord[];
  campaignIntakes?: CampaignIntakeRecord[];
  organizedUpdates?: OrganizedUpdateRecord[];
  linkWidgets?: LinkWidgetRecord[];
  shiftHandovers?: ShiftHandoverRecord[];
  coverageRecords?: CoverageRecord[];
  standaloneTasks?: StandaloneTaskRecord[];
};

export type TaskRecord = {
  id: number;
  description: string;
  campaign: string;
  assignedTo: string;
  priority: string;
  status: string;
  category: string;
  slaHrs: number;
  startDateTime: string;
  endDateTime?: string;
  teamId?: string;
  name?: string;
  [key: string]: unknown;
};

export type SuccessRecord = {
  id?: string | number;
  title?: string;
  detail?: string;
  agent?: string;
  campaign?: string;
  date?: string;
  time?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type NotificationRecord = {
  id?: string | number;
  assignedTo?: string;
  [key: string]: unknown;
};

export type MistakeRecord = {
  id: string;
  taskId: string | number;
  taskDescription: string;
  campaign: string;
  team: string;
  mistakeDescription: string;
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
};

export type WorkspaceRecord = {
  id?: string | number;
  updatedAt?: string;
  [key: string]: unknown;
};

export type OpsCampaignRecord = {
  id?: string | number;
  name?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type CampaignIntakeRecord = {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type OrganizedUpdateRecord = {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type LinkWidgetRecord = {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type ShiftHandoverRecord = {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type CoverageRecord = {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type StandaloneTaskRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  teamId: string;
  status: string;
  priority: string;
  dueDate: string;
  assignmentMode: string;
  assignedToName: string;
  assignedToEmail: string;
  notes: string;
  linkedCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type TranslateToEnglishResponse = {
  translatedText: string;
  sourceLanguage: string;
};
