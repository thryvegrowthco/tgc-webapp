import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="px-6 py-12 text-center">
      {Icon && (
        <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Icon className="h-4 w-4 text-brand-600" />
        </div>
      )}
      <h3 className="font-semibold text-neutral-900 text-sm mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-400 mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
