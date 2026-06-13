import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnalytics, getMyRoles } from "@/lib/db.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Utensils, Heart, Truck, Users, Sparkles, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Annapurna" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchA = useServerFn(getAnalytics);
  const fetchR = useServerFn(getMyRoles);
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: () => fetchA() });
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => fetchR() });

  const stats = [
    { label: "Total donations", value: data?.totalDonations ?? 0, icon: Utensils, color: "text-primary" },
    { label: "Servings saved", value: data?.totalServingsSaved ?? 0, icon: Heart, color: "text-gold" },
    { label: "Open requests", value: data?.totalRequests ?? 0, icon: BookOpen, color: "text-accent-foreground" },
    { label: "Active volunteers", value: data?.volunteers ?? 0, icon: Truck, color: "text-primary" },
    { label: "Partner NGOs", value: data?.ngos ?? 0, icon: Users, color: "text-primary" },
    { label: "Available now", value: data?.availableDonations ?? 0, icon: Sparkles, color: "text-gold" },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl font-semibold">Dashboard</h1>
          <div className="mt-2 flex gap-1 flex-wrap">
            {(roles ?? []).map((r) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/donations"><Button className="bg-primary text-primary-foreground">New donation</Button></Link>
          <Link to="/assistant"><Button variant="outline">Ask AI guide</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i} className="p-5 shadow-soft">
            <s.icon className={`size-5 ${s.color} mb-3`} />
            <div className="font-display text-3xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6 shadow-soft">
        <h2 className="font-display text-xl font-semibold mb-4">Weekly donation activity</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.weeklyTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" /><YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="donations" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
