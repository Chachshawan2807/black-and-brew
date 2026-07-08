import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';

export function DashboardSectionSkeleton({ label }: { label: string }) {
  return <RouteLoadingSkeleton label={label} />;
}
