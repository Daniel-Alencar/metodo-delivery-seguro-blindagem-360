import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hof")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
});
