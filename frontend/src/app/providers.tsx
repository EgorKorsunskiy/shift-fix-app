import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/api/client";
import { ToastProvider } from "@/components/ui/Toast";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError && (error.status === 404 || error.status === 409 || error.status === 422)) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
        staleTime: 5_000,
        refetchIntervalInBackground: false,
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
