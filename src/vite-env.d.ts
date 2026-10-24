/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Бэкенд, к которому все запросы идут напрямую. Пусто — через прокси. */
  readonly VITE_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
