import { describe, it, expect } from 'vitest';
import {
  campaignSchema,
  taskSchema,
  userSchema,
  successLogSchema,
  createFormValidator,
} from '../lib/validation';

describe('Validation Schemas', () => {
  describe('campaignSchema', () => {
    it('should validate a valid campaign', () => {
      const validCampaign = {
        name: 'Test Campaign',
        client: 'Test Client',
        phase: 'Planning' as const,
        status: 'Active' as const,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        budget: 10000,
        description: 'Test description',
      };

      expect(() => campaignSchema.parse(validCampaign)).not.toThrow();
    });

    it('should reject campaign with missing required fields', () => {
      const invalidCampaign = {
        name: '',
        client: 'Test Client',
      };

      expect(() => campaignSchema.parse(invalidCampaign)).toThrow();
    });

    it('should reject campaign with invalid phase', () => {
      const invalidCampaign = {
        name: 'Test Campaign',
        client: 'Test Client',
        phase: 'InvalidPhase',
        status: 'Active' as const,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      expect(() => campaignSchema.parse(invalidCampaign)).toThrow();
    });
  });

  describe('taskSchema', () => {
    it('should validate a valid task', () => {
      const validTask = {
        title: 'Test Task',
        description: 'Test description',
        category: 'Development',
        teamId: 'team-1',
        status: 'Pending' as const,
        priority: 'Medium' as const,
        dueDate: '2024-12-31',
        assignmentMode: 'Individual' as const,
        assignedToName: 'John Doe',
        assignedToEmail: 'john@example.com',
        notes: 'Test notes',
      };

      expect(() => taskSchema.parse(validTask)).not.toThrow();
    });

    it('should reject task with invalid email', () => {
      const invalidTask = {
        title: 'Test Task',
        category: 'Development',
        teamId: 'team-1',
        status: 'Pending' as const,
        priority: 'Medium' as const,
        dueDate: '2024-12-31',
        assignmentMode: 'Individual' as const,
        assignedToEmail: 'invalid-email',
      };

      expect(() => taskSchema.parse(invalidTask)).toThrow();
    });
  });

  describe('userSchema', () => {
    it('should validate a valid user', () => {
      const validUser = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin' as const,
        features: ['dashboard', 'analytics'],
      };

      expect(() => userSchema.parse(validUser)).not.toThrow();
    });

    it('should reject user with invalid email', () => {
      const invalidUser = {
        name: 'John Doe',
        email: 'invalid-email',
        role: 'admin' as const,
      };

      expect(() => userSchema.parse(invalidUser)).toThrow();
    });
  });

  describe('successLogSchema', () => {
    it('should validate a valid success log', () => {
      const validLog = {
        title: 'Great Success',
        detail: 'We achieved our goal',
        campaign: 'Test Campaign',
      };

      expect(() => successLogSchema.parse(validLog)).not.toThrow();
    });

    it('should use default campaign when not provided', () => {
      const logWithoutCampaign = {
        title: 'Great Success',
        detail: 'We achieved our goal',
      };

      const result = successLogSchema.parse(logWithoutCampaign);
      expect(result.campaign).toBe('General');
    });
  });

  describe('createFormValidator', () => {
    it('should return success for valid data', () => {
      const validator = createFormValidator(userSchema);
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
      };

      const result = validator(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should return errors for invalid data', () => {
      const validator = createFormValidator(userSchema);
      const invalidData = {
        name: '',
        email: 'invalid-email',
        role: 'invalid-role',
      };

      const result = validator(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveProperty('name');
        expect(result.errors).toHaveProperty('email');
        expect(result.errors).toHaveProperty('role');
      }
    });
  });
});