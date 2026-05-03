import { createFileRoute } from "@tanstack/react-router";
import Drill from "../screens/Drill";

type DrillSearch = {
  clusterId?: number;
};

export const Route = createFileRoute("/drill")({
  validateSearch: (search: Record<string, unknown>): DrillSearch => ({
    clusterId: typeof search.clusterId === "number" ? search.clusterId : undefined,
  }),
  component: Drill,
});
