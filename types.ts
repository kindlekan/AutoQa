
export enum TicketStatus {
  RESOLVED = 'Resolved',
  ESCALATED = 'Escalated',
  PENDING = 'Pending'
}

export enum TicketCategory {
  BILLING = 'Billing',
  TECHNICAL = 'Technical',
  SHIPPING = 'Shipping',
  RETURNS = 'Returns',
  OTHER = 'Other'
}

export enum Sentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative'
}

export interface ChatMessage {
  role: 'Customer' | 'Agent';
  text: string;
}

export interface Ticket {
  id: string;
  customerName: string;
  category: TicketCategory;
  status: TicketStatus;
  sentiment: Sentiment;
  transcript: ChatMessage[];
  timestamp: string;
  originalData: Record<string, any>;
}

export interface AuditResult {
  score: number; // 0-100
  empathyScore: number; // 1-10
  solutionScore: number; // 1-10
  grammarScore: number; // 1-10
  coachingTip: string;
  summary: string;
}

export interface DashboardStats {
  resolutionRate: number;
  avgSentimentScore: number; // mapped from sentiment
  topCategory: string;
  autoQAScore: number; // Aggregate of audit scores
  totalTickets: number;
}
