import Link from 'next/link';

interface StepBreadcrumbProps {
  stepId: string;
}

export function StepBreadcrumb({ stepId }: StepBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/steps" className="hover:text-foreground">
        Steps
      </Link>
      <span>/</span>
      <span className="text-foreground">{stepId}</span>
    </div>
  );
}
