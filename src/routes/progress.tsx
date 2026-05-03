import { createFileRoute } from "@tanstack/react-router";
import Progress from "../screens/Progress";

export const Route = createFileRoute("/progress")({
  component: Progress,
});
