import type { EditorServices } from '@/features/edition/editor/services';
import type { EnvironmentInfo } from '@/features/edition/environment';

export const servicesCache: {
    services: EditorServices | null;
    environment: Promise<EnvironmentInfo> | null;
} = { services: null, environment: null };
