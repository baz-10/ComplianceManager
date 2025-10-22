import { QueryClient } from "@tanstack/react-query";
import { handleQueryError } from "@/utils/errorHandler";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (res.ok) {
          return res.json();
        }

        if (res.status === 401) {
          return null;
        }

        let errorPayload: any = {
          error: {
            message: res.statusText || "Request failed",
            code: "UNKNOWN_ERROR",
          },
        };

        let rawBody: string | undefined;
        try {
          rawBody = await res.text();
        } catch {
          rawBody = undefined;
        }

        if (rawBody) {
          try {
            const parsed = JSON.parse(rawBody);
            if (parsed && typeof parsed === "object") {
              errorPayload = parsed;
            } else if (typeof parsed === "string") {
              errorPayload = {
                error: {
                  message: parsed,
                  code: "UNKNOWN_ERROR",
                },
              };
            }
          } catch {
            errorPayload = {
              error: {
                message: rawBody,
                code: "UNKNOWN_ERROR",
              },
            };
          }
        }

        throw errorPayload;
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
