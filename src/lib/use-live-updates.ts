import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useLiveUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/events");
    const refresh = () => {
      queryClient.invalidateQueries();
    };

    source.addEventListener("open", refresh);
    source.addEventListener("update", refresh);

    return () => source.close();
  }, [queryClient]);
}
