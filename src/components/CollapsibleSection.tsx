import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
  className
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('w95-panel overflow-hidden p-0', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full min-h-11 items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
          {icon}
          <span className="truncate">{title}</span>
          {badge}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">{children}</div>}
    </section>
  );
}
