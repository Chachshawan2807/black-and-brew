import { z } from 'zod';

export const aiSuggestionItemSchema = z.object({
  suggestionKey: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  module: z.enum([
    'schedule',
    'dashboard',
    'inventory',
    'inventory_count',
    'inventory_accuracy',
    'branch_withdraw',
    'bean_orders',
    'maintenance',
    'branch2',
    'custom',
  ]),
  priority: z.enum(['urgent', 'normal', 'low']),
  rationale: z.string().min(1).max(500),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
  actionHref: z.string().max(200).optional(),
});

export const aiSuggestionResponseSchema = z.object({
  suggestions: z.array(aiSuggestionItemSchema).max(3),
});

export type AiSuggestionSchemaItem = z.infer<typeof aiSuggestionItemSchema>;
