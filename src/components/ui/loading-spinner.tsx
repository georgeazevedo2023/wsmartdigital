import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-16 h-16',
} as const;

interface LoadingSpinnerProps {
  /** Spinner icon size */
  size?: keyof typeof sizeMap;
  /** Optional label shown beside or below the spinner */
  label?: string;
  /** Wrapper className – defaults to centered flex container with vertical padding */
  className?: string;
  /** Color variant */
  variant?: 'muted' | 'primary';
}

const LoadingSpinner = ({
  size = 'md',
  label,
  className,
  variant = 'muted',
}: LoadingSpinnerProps) => {
  const colorClass = variant === 'primary' ? 'text-primary' : 'text-muted-foreground';

  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={cn(sizeMap[size], 'animate-spin', colorClass)} />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
};

export { LoadingSpinner };
