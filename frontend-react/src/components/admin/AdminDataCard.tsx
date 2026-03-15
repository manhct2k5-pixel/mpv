import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface AdminDataCardProps {
  title?: string;
  caption?: string;
  children: ReactNode;
  className?: string;
}

const AdminDataCard = ({ title, caption, children, className }: AdminDataCardProps) => {
  return (
    <article className={cn('admin-card p-4 sm:p-5', className)}>
      {title ? <h3 className="text-sm font-semibold text-[var(--admin-text)]">{title}</h3> : null}
      {caption ? <p className="mt-1 text-xs text-[var(--admin-muted)]">{caption}</p> : null}
      <div className={cn(title || caption ? 'mt-4' : '')}>{children}</div>
    </article>
  );
};

export default AdminDataCard;
