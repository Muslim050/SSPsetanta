/**
 * Адрес бэкенда для скриптов — тот же, что у прокси Vite: API_PROXY_TARGET
 * из .env в корне проекта, иначе прод. Флаг --api в скриптах важнее.
 */
try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // .env нет — берём адрес по умолчанию.
}

export const API_TARGET =
  process.env.API_PROXY_TARGET || 'https://setantastaging.pythonanywhere.com'
