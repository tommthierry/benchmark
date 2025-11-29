// Question validation schemas
import { z } from 'zod';

export const evaluationMethodSchema = z.enum(['exact_match', 'contains', 'regex', 'llm_judge']);
export type EvaluationMethod = z.infer<typeof evaluationMethodSchema>;

export const difficultySchema = z.enum(['easy', 'medium', 'hard', 'expert']);
export type Difficulty = z.infer<typeof difficultySchema>;

export const questionStatusSchema = z.enum(['active', 'archived']);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

export const evaluationCriteriaSchema = z.object({
  pattern: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  rubric: z.string().optional(),
}).optional();

export const createQuestionSchema = z.object({
  typeId: z.string().min(1, 'Question type ID is required'),
  content: z.string().min(1, 'Content is required').max(10000),
  expectedAnswer: z.string().max(10000).optional(),
  evaluationMethod: evaluationMethodSchema.optional().default('llm_judge'),
  evaluationCriteria: evaluationCriteriaSchema,
  difficulty: difficultySchema.optional().default('medium'),
  weight: z.number().positive().optional().default(1.0),
  status: questionStatusSchema.optional().default('active'),
});

export const updateQuestionSchema = createQuestionSchema.partial();

// Question Type schemas
export const createQuestionTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  weight: z.number().positive().optional().default(1.0),
});

export const updateQuestionTypeSchema = createQuestionTypeSchema.partial();

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type CreateQuestionTypeInput = z.infer<typeof createQuestionTypeSchema>;
export type UpdateQuestionTypeInput = z.infer<typeof updateQuestionTypeSchema>;
