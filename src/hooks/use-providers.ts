import { useQuery } from "@tanstack/react-query";
import { fetchProviders } from "@/lib/api";

export function useProviders() {
  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
    staleTime: 5 * 60 * 1000,
  });

  return {
    providers: data ?? [],
    loading: isPending || isFetching,
    error: error
      ? error instanceof Error
        ? error.message
        : "加载服务商失败"
      : null,
  };
}
