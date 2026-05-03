import { createFileRoute } from "@tanstack/react-router";
import Library from "../screens/Library";

export const Route = createFileRoute("/library")({
  component: Library,
});
