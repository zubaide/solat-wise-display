import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDisplayData } from "../lib/display.functions";
import { useLiveUpdates } from "../lib/use-live-updates";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  useLiveUpdates();
  const { data, error } = useQuery({
    queryKey: ["display"],
    queryFn: () => getDisplayData(),
  });

  if (error) {
    return <pre className="p-4 text-red-400">{String(error)}</pre>;
  }
  if (!data) {
    return <div className="p-4">Loading...</div>;
  }

  return <pre className="h-screen overflow-auto p-4 text-sm">{JSON.stringify(data, null, 2)}</pre>;
}
