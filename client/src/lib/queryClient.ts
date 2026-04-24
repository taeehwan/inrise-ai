import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string | RequestInit,
  data?: unknown | undefined,
): Promise<Response> {
  const upperMethod = method.toUpperCase();
  const knownMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

  let requestUrl = typeof url === "string" ? url : method;
  let requestInit: RequestInit = { credentials: "include" };

  if (knownMethods.has(upperMethod)) {
    requestInit = {
      ...requestInit,
      method: upperMethod,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    };
  } else if (typeof data === "string" && knownMethods.has(data.toUpperCase())) {
    requestUrl = method;
    requestInit = {
      ...requestInit,
      method: data.toUpperCase(),
      headers: {},
    };
  } else {
    requestUrl = method;
    const legacyInit = (url ?? {}) as RequestInit;
    requestInit = {
      ...requestInit,
      ...legacyInit,
      credentials: "include",
    };
  }

  const res = await fetch(requestUrl, requestInit);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Increment the AI feedback counter (used for survey trigger)
const AI_FEEDBACK_COUNT_KEY = 'inrise_ai_feedback_count';
export function incrementAiFeedbackCount() {
  try {
    const current = parseInt(localStorage.getItem(AI_FEEDBACK_COUNT_KEY) || '0', 10);
    localStorage.setItem(AI_FEEDBACK_COUNT_KEY, String(current + 1));
  } catch (_) {}
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
