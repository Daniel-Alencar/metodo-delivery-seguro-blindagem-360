import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/estetica")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
});
