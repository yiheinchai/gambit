import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-full flex flex-col bg-zinc-900 font-sans">
      <Outlet />
    </div>
  ),
});
