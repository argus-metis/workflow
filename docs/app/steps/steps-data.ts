export type StepCategory =
  | 'AI Agents & Services'
  | 'AI'
  | 'Analytics'
  | 'Authentication'
  | 'CMS'
  | 'Commerce'
  | 'Database'
  | 'DevTools'
  | 'Experimentation'
  | 'Flags'
  | 'Logging'
  | 'Messaging'
  | 'Monitoring'
  | 'Observability'
  | 'Payments'
  | 'Productivity'
  | 'Searching'
  | 'Security'
  | 'Storage'
  | 'Testing'
  | 'Video'
  | 'Webhooks'
  | 'Workflow';

export type StepType = 'Native' | 'External';

export interface Step {
  id: string;
  name: string;
  description: string;
  category: StepCategory;
  type: StepType;
  featured?: boolean;
  author?: string;
  downloads?: number;
  icon?: string;
}

export const stepsData: Step[] = [
  // AI Category
  {
    id: 'ai-chat',
    name: 'AI Chat',
    description:
      'Call LLMs with streaming, tool calling, and durable state management.',
    category: 'AI',
    type: 'Native',
    author: 'Vercel',
    downloads: 18000,
  },

  // Database Category
  {
    id: 'database-query',
    name: 'Database Query',
    description:
      'Execute database queries with connection pooling and retry logic.',
    category: 'Database',
    type: 'Native',
    author: 'Vercel',
    downloads: 11000,
  },

  // Messaging Category
  {
    id: 'send-email',
    name: 'Send Email',
    description:
      'Send transactional emails via your email provider with delivery tracking.',
    category: 'Messaging',
    type: 'Native',
    author: 'Vercel',
    downloads: 12000,
  },
  {
    id: 'slack-message',
    name: 'Slack Message',
    description:
      'Send messages to Slack channels with rich formatting support.',
    category: 'Messaging',
    type: 'External',
    author: 'Community',
    downloads: 8900,
  },

  // Workflow Category
  {
    id: 'sleep',
    name: 'Sleep',
    description:
      'Pause workflow execution for a specified duration without consuming resources.',
    category: 'Workflow',
    type: 'Native',
    author: 'Vercel',
    downloads: 14000,
  },

  // Webhooks Category
  {
    id: 'webhook-listener',
    name: 'Webhook Listener',
    description:
      'Create durable webhooks that pause workflow execution until triggered.',
    category: 'Webhooks',
    type: 'Native',
    author: 'Vercel',
    downloads: 10000,
  },
  {
    id: 'create-webhook',
    name: 'Create Webhook',
    description: 'Create webhooks that pause workflow execution until called.',
    category: 'Webhooks',
    type: 'Native',
    author: 'Vercel',
    downloads: 9200,
  },
];
