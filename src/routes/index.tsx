import { createFileRoute } from "@tanstack/react-router";
import Home from "@/app/page";

export const Route = createFileRoute("/")({
  component: Home,
});
