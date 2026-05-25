import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ebook-forge")({
  beforeLoad: () => {
    throw redirect({ to: "/produtos/ebook" });
  },
  component: () => null,
});
