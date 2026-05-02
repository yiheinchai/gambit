import { createFileRoute } from "@tanstack/react-router";
import DebugPage from "@/app/debug/page";

export const Route = createFileRoute("/debug")({
  component: DebugPage,
});
