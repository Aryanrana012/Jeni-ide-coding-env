export type PlanStatus = 'draft' | 'ready' | 'blocked';
export type PlanStepStatus = 'pending' | 'needs_inspection';

export interface PlanStep {
  id: string;
  description: string;
  reason: string;
  status: PlanStepStatus;
  relevantFiles: string[];
  notes?: string[];
}

export interface Plan {
  id: string;
  goal: string;
  summary: string;
  assumptions: string[];
  relevantFiles: string[];
  steps: PlanStep[];
  status: PlanStatus;
}
