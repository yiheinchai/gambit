import { createFileRoute } from "@tanstack/react-router";
import Review from "../screens/Review";

export const Route = createFileRoute("/review")({
  component: Review,
});
