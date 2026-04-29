import { z } from 'zod';

// Campaign validation schema
export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name too long'),
  client: z.string().min(1, 'Client name is required').max(100, 'Client name too long'),
  phase: z.enum(['Planning', 'Briefing', 'Activation', 'Live', 'Post-Campaign', 'Closed']),
  status: z.enum(['Planning', 'Active', 'Paused', 'Completed', 'Archived']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  description: z.string().max(1000, 'Description too long').optional().default(''),
});

// Task validation schema
export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Task title too long'),
  description: z.string().max(1000, 'Description too long').optional().default(''),
  category: z.string().min(1, 'Category is required'),
  teamId: z.string().min(1, 'Team is required'),
  status: z.enum(['Pending', 'In Progress', 'Blocked', 'Done']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  dueDate: z.string().min(1, 'Due date is required'),
  assignmentMode: z.enum(['Individual', 'Team', 'Unassigned']),
  assignedToName: z.string().optional().default(''),
  assignedToEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes too long').optional().default(''),
  linkedCampaignId: z.string().optional().nullable(),
});

// User validation schema
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member']),
  features: z.array(z.string()).optional().default([]),
});

// Success log validation schema
export const successLogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  detail: z.string().min(1, 'Detail is required').max(1000, 'Detail too long'),
  campaign: z.string().max(100, 'Campaign name too long').optional().default('General'),
});

// Campaign intake validation schema
export const campaignIntakeSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name too long'),
  clientName: z.string().min(1, 'Client name is required').max(100, 'Client name too long'),
  briefingDate: z.string().min(1, 'Briefing date is required'),
  launchDate: z.string().min(1, 'Launch date is required'),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  objectives: z.string().max(1000, 'Objectives too long').optional().default(''),
  targetAudience: z.string().max(500, 'Target audience description too long').optional().default(''),
  deliverables: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000, 'Notes too long').optional().default(''),
});

// Link widget validation schema
export const linkWidgetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  url: z.string().url('Invalid URL'),
  description: z.string().max(200, 'Description too long').optional().default(''),
  category: z.string().min(1, 'Category is required'),
  isActive: z.boolean().default(true),
});

// Organized update validation schema
export const organizedUpdateSchema = z.object({
  originalText: z.string().min(1, 'Original text is required'),
  translatedText: z.string().min(1, 'Translated text is required'),
  sourceLanguage: z.string().min(1, 'Source language is required'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  notes: z.string().max(500, 'Notes too long').optional().default(''),
});

// Shift handover validation schema
export const shiftHandoverSchema = z.object({
  fromShift: z.string().min(1, 'From shift is required'),
  toShift: z.string().min(1, 'To shift is required'),
  date: z.string().min(1, 'Date is required'),
  summary: z.string().min(1, 'Summary is required').max(1000, 'Summary too long'),
  pendingTasks: z.array(z.string()).optional().default([]),
  issues: z.array(z.string()).optional().default([]),
  notes: z.string().max(500, 'Notes too long').optional().default(''),
});

// Coverage record validation schema
export const coverageRecordSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required'),
  influencerName: z.string().min(1, 'Influencer name is required'),
  platform: z.string().min(1, 'Platform is required'),
  contentType: z.string().min(1, 'Content type is required'),
  postUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  engagementMetrics: z.object({
    likes: z.number().min(0).optional(),
    comments: z.number().min(0).optional(),
    shares: z.number().min(0).optional(),
    views: z.number().min(0).optional(),
  }).optional(),
  status: z.enum(['Pending', 'Posted', 'Approved', 'Rejected']),
  notes: z.string().max(500, 'Notes too long').optional().default(''),
});

// Environment variables validation
export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
});

// Export types
export type CampaignFormData = z.infer<typeof campaignSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type SuccessLogFormData = z.infer<typeof successLogSchema>;
export type CampaignIntakeFormData = z.infer<typeof campaignIntakeSchema>;
export type LinkWidgetFormData = z.infer<typeof linkWidgetSchema>;
export type OrganizedUpdateFormData = z.infer<typeof organizedUpdateSchema>;
export type ShiftHandoverFormData = z.infer<typeof shiftHandoverSchema>;
export type CoverageRecordFormData = z.infer<typeof coverageRecordSchema>;

// Validation helper functions
export function validateEnvVars() {
  try {
    envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

export function createFormValidator<T extends z.ZodSchema>(schema: T) {
  return (data: unknown) => {
    try {
      return { success: true, data: schema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          errors: error.errors.reduce((acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          }, {} as Record<string, string>)
        };
      }
      return { success: false, errors: { _form: 'Validation failed' } };
    }
  };
}