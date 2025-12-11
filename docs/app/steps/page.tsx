import type { Metadata } from 'next';
import { StepsRegistry } from './registry';

export const metadata: Metadata = {
  title: 'Steps Registry',
  description: 'Browse and install pre-built workflow steps',
};

export default function StepsPage() {
  return <StepsRegistry />;
}
