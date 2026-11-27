import type { EditorServices } from '@/features/edition/editor/services';
import { servicesCache } from '@/features/edition/editor/services-cache';
import type { EnvironmentInfo } from '@/features/edition/environment';

export const setServices = (services: EditorServices | null): void => {
    servicesCache.services = services;
};

export const setEnvironment = (info: EnvironmentInfo | null): void => {
    servicesCache.environment = info === null ? null : Promise.resolve(info);
};
