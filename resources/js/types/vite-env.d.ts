/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME?: string;
    readonly VITE_BUGSNAG_API_KEY?: string;
    readonly VITE_BUGSNAG_RELEASE_STAGE?: string;
    readonly VITE_INERTIA_SSR_PORT?: string;
    readonly VITE_REVERB_APP_KEY?: string;
    readonly VITE_REVERB_HOST?: string;
    readonly VITE_REVERB_PORT?: string;
    readonly VITE_REVERB_SCHEME?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
