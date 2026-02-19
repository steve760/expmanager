import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-warm-50/80 p-16 text-center dark:border-stone-600 dark:bg-stone-800/50">
      <div className="mx-auto max-w-md">
        <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
        {description && (
          <p className="mt-3 text-sm text-stone-500 leading-relaxed dark:text-stone-300">{description}</p>
        )}
        {action != null && <div className="mt-8">{action}</div>}
      </div>
    </div>
  );
}
