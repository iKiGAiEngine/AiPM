import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Add authorization header if token exists
  const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add content type for requests with data
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle query keys properly - first element should be the full URL path
    let url: string;
    if (queryKey.length === 1) {
      url = queryKey[0] as string;
    } else {
      // For multi-part keys like ['/api/projects', id, 'materials']
      // We need to construct: /api/projects/{id}/materials
      const [basePath, ...params] = queryKey;
      if (params.length === 0) {
        url = basePath as string;
      } else if (params.length === 1) {
        // Single param like ['/api/projects', id] -> /api/projects/{id}
        url = `${basePath}/${params[0]}`;
      } else {
        // Multiple params like ['/api/projects', id, 'materials'] -> /api/projects/{id}/materials
        const [id, ...rest] = params;
        url = `${basePath}/${id}/${rest.join('/')}`;
      }
    }
    
    // Add authorization header if token exists
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
