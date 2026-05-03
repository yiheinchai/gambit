import { createFileRoute } from "@tanstack/react-router";
import Loading from "../screens/Loading";

export const Route = createFileRoute("/loading")({
  component: Loading,
});
