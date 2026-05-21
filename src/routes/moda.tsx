import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/moda")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
});
