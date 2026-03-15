import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SectionCardProps {
  title: string;
  description?: string;
  className?: string;
  headerSlot?: ReactNode;
  children: ReactNode;
}

const SectionCard = ({ title, description, className, headerSlot, children }: SectionCardProps) => {
  return (
    <section className={cn('glass-panel p-4 sm:p-6', className)}>
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-cocoa truncate">{title}</h2>
          {description && <p className="text-[10px] sm:text-xs text-cocoa/60 mt-0.5">{description}</p>}
        </div>
        {headerSlot}
      </div>
      {children}
    </section>
  );
};

export default SectionCard;
