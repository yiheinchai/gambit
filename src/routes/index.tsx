import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "../store";
import Landing from "../screens/Landing";

function IndexRoute() {
  const store = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (store.phase === "results" && store.username) {
      navigate({ to: "/dashboard" });
    }
  }, [store.phase, store.username, navigate]);

  return <Landing />;
}

export const Route = createFileRoute("/")({
  component: IndexRoute,
});
