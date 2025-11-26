'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const rows = [
  {
    label: 'chatWorkflow',
    className:
      'bg-[#E1F0FF] dark:bg-[#00254D] border-[#99CEFF] text-[#0070F3] dark:border-[#0067D6] dark:text-[#52AEFF]',
    start: 0,
    duration: 100,
  },
  {
    label: 'agent.stream',
    className:
      'bg-[#DCF6DC] dark:bg-[#1B311E] border-[#99E59F] text-[#46A758] dark:border-[#297C3B] dark:text-[#6CDA76]',
    start: 2,
    duration: 16,
  },
  {
    label: 'searchWeb',
    className:
      'bg-[#FFF4E5] dark:bg-[#3D2800] border-[#FFCC80] text-[#F5A623] dark:border-[#9A6700] dark:text-[#FFCA28]',
    start: 20,
    duration: 13,
  },
  {
    label: 'agent.stream',
    className:
      'bg-[#DCF6DC] dark:bg-[#1B311E] border-[#99E59F] text-[#46A758] dark:border-[#297C3B] dark:text-[#6CDA76]',
    start: 37,
    duration: 16,
  },
  {
    label: 'waitForHumanApproval',
    className:
      'bg-[#FCE7F3] dark:bg-[#4A1D34] border-[#F9A8D4] text-[#EC4899] dark:border-[#BE185D] dark:text-[#F472B6]',
    start: 57,
    duration: 24,
  },
  {
    label: 'agent.stream',
    className:
      'bg-[#DCF6DC] dark:bg-[#1B311E] border-[#99E59F] text-[#46A758] dark:border-[#297C3B] dark:text-[#6CDA76]',
    start: 84,
    duration: 16,
  },
];

export const AgentTraces = () => (
  <div className="not-prose my-8 rounded-lg border bg-card p-4 sm:p-6">
    <div className="space-y-2 w-full">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="flex flex-col overflow-hidden"
          style={{
            marginLeft: `${row.start}%`,
            width: `${row.duration}%`,
          }}
        >
          <div className="relative h-6 w-full">
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              whileInView={{ width: 'auto', opacity: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{
                duration: 0.55,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                'h-full rounded-sm border overflow-hidden',
                row.className
              )}
            >
              <div className="flex justify-between items-center h-full px-2">
                <span className="text-[10px] sm:text-[11px] font-mono font-medium text-foreground truncate leading-none">
                  {row.label}
                </span>
                {index === 0 && (
                  <span className="text-[10px] sm:text-[11px] hidden sm:inline leading-none">
                    {row.duration}ms
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
