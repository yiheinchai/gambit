import { createFileRoute } from "@tanstack/react-router";
import Detail from "../screens/Detail";

export const Route = createFileRoute("/detail")({
  validateSearch: (search: Record<string, unknown>) => ({
    clusterId: typeof search.clusterId === "number" ? search.clusterId : undefined,
  }),
  component: Detail,
});
