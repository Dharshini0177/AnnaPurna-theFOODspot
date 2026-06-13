import { createFileRoute, notFound } from "@tanstack/react-router";
import { getArticle } from "@/lib/db.functions";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ params }) => {
    const a = await getArticle({ data: { slug: params.slug } });
    if (!a) throw notFound();
    return a;
  },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.title ?? "Article"} — Annapurna` },
    { name: "description", content: loaderData?.excerpt ?? "" },
    { property: "og:title", content: loaderData?.title ?? "" },
    { property: "og:description", content: loaderData?.excerpt ?? "" },
    ...(loaderData?.cover_image_url ? [{ property: "og:image", content: loaderData.cover_image_url }] : []),
  ]}),
  component: Article,
});

function Article() {
  const a = Route.useLoaderData();
  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <Badge variant="secondary" className="mb-3">{a.category}</Badge>
      <h1 className="font-display text-4xl md:text-5xl font-semibold text-balance">{a.title}</h1>
      {a.cover_image_url && (
        <img src={a.cover_image_url} alt={a.title} className="w-full h-72 object-cover rounded-2xl mt-6 shadow-soft" />
      )}
      <div className="prose prose-lg mt-8 max-w-none prose-headings:font-display prose-headings:text-primary">
        <ReactMarkdown>{a.content}</ReactMarkdown>
      </div>
    </article>
  );
}
