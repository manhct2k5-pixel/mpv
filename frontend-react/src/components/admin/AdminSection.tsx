import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface AdminSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

const AdminSection = ({ title, description, actions, children, className }: AdminSectionProps) => {
  return (
    <section className={cn('admin-section', className)}>
      <header className="admin-section__header">
        <div>
          <h2 className="admin-section__title">{title}</h2>
          {description ? <p className="admin-section__description">{description}</p> : null}
        </div>
        {actions ? <div className="admin-section__actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
};

export default AdminSection;
