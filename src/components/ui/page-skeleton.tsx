import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  /** Header rows: array of widths e.g. ['w-48', 'w-64'] */
  header?: string[];
  /** Grid columns responsive classes */
  gridCols?: string;
  /** Number of skeleton cards */
  cards?: number;
  /** Height of each card */
  cardHeight?: string;
  /** Max width wrapper */
  maxWidth?: string;
  className?: string;
}

const PageSkeleton = ({
  header = ['w-48', 'w-64'],
  gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  cards = 3,
  cardHeight = 'h-48',
  maxWidth = 'max-w-7xl',
  className,
}: PageSkeletonProps) => (
  <div className={cn('space-y-6 mx-auto animate-fade-in', maxWidth, className)}>
    {header.length > 0 && (
      <div className="space-y-2">
        {header.map((w, i) => (
          <Skeleton key={i} className={cn('h-6', w, i === 0 && 'h-8')} />
        ))}
      </div>
    )}
    <div className={cn('grid gap-4', gridCols)}>
      {Array.from({ length: cards }, (_, i) => (
        <Skeleton key={i} className={cardHeight} />
      ))}
    </div>
  </div>
);

export { PageSkeleton };
