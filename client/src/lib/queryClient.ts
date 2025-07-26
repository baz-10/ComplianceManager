import { QueryClient } from "@tanstack/react-query";
import { handleQueryError } from "@/utils/errorHandler";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }

          // Try to parse as JSON error response
          let errorData;
          try {
            errorData = await res.json();
          } catch {
            errorData = { error: { message: await res.text(), code: 'UNKNOWN_ERROR' } };
          }

          throw errorData;
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      onError: handleQueryError,
    },
    mutations: {
      onError: handleQueryError,
    },
  },
});