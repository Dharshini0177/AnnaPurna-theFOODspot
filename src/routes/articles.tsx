import { createFileRoute, Link } from "@tanstack/react-router";
import { listArticles } from "@/lib/db.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/articles")({
  head: () => ({ meta: [
    { title: "Nutrition awareness — Annapurna" },
    { name: "description", content: "Articles on balanced diets, micronutrients, meal planning, and sustainability." },
  ]}),
  loader: () => listArticles(),
  component: Articles,
});

function Articles() {
  const data = Route.useLoaderData();
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl font-semibold">Nutrition awareness</h1>
        <p className="text-muted-foreground mt-2">Curated guides for healthier eating and conscious sharing.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((a: any) => (
          <Link key={a.id} to="/articles/$slug" params={{ slug: a.slug }}>
            <Card className="overflow-hidden h-full shadow-soft hover:shadow-warm transition-shadow">
              {a.cover_image_url && <img src={a.cover_image_url} alt={a.title} className="w-full h-48 object-cover" loading="lazy" />}
              <div className="p-5">
                <Badge variant="secondary" className="mb-2">{a.category}</Badge>
                <h2 className="font-display text-xl font-semibold">{a.title}</h2>
                <p className="text-sm text-muted-foreground mt-2">{a.excerpt}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
