import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/livro-template-mestre")({
  beforeLoad: () => { throw redirect({ to: "/produtos/ebook" }); },
  component: () => null,
});
