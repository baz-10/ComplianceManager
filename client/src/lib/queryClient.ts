import { QueryClient } from "@tanstack/react-query";
import { userSchema } from "@/types/user";

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

          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        const data = await res.json();

        // If this is a user query, validate the response
        if (queryKey[0] === '/api/user') {
          try {
            return userSchema.parse(data);
          } catch (e) {
            console.error('Invalid user data:', e);
            return null;
          }
        }

        return data;
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    }
  },
});