import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-cocoa">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-cocoa/60 mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
};

export default PageHeader;
