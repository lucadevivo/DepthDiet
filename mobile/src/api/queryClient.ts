import { QueryClient } from "@tanstack/react-query";

/**
 * Istanza singola di QueryClient per tutta l'app.
 * Default pensati per uso single-user mobile: niente refetch aggressivo,
 * gestione esplicita di offline/retry.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // I dati alimentari del giorno cambiano poco: evitiamo refetch al focus.
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: 2,
    },
    mutations: {
      retry: 0,
    },
  },
});
