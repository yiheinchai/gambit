import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-full flex flex-col font-sans" style={{ background: "var(--bg)" }}>
      <Outlet />
    </div>
  ),
});
