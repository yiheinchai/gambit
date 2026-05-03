import { createFileRoute } from "@tanstack/react-router";
import Quest from "../screens/Quest";

export const Route = createFileRoute("/quest")({
  component: Quest,
});
