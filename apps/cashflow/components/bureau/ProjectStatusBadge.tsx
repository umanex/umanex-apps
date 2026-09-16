import { Badge } from '@umanex/ui/components/ui/badge';
import type { ProjectStatus } from '../../lib/bureau/types';
import { PROJECT_STATUS_LABEL } from '../../lib/bureau/labels';

const VARIANT: Record<ProjectStatus, 'outline' | 'secondary' | 'warning' | 'success'> = {
  gepland: 'outline',
  lopend: 'secondary',
  gepauzeerd: 'warning',
  afgerond: 'success',
  geannuleerd: 'outline',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANT[status]}>{PROJECT_STATUS_LABEL[status]}</Badge>;
}
