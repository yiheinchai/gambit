import { createFileRoute } from "@tanstack/react-router";
import Leagues from "../screens/Leagues";

export const Route = createFileRoute("/leagues")({
  component: Leagues,
});
