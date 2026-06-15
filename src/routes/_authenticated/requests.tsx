import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { myRequests, incomingRequests, updateRequestStatus } from "@/lib/db.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Requests — Annapurna" }] }),
  component: Requests,
});

function Requests() {
  const f1 = useServerFn(myRequests); const f2 = useServerFn(incomingRequests);
  const mine = useQuery({ queryKey: ["my-requests"], queryFn: () => f1() });
  const incoming = useQuery({ queryKey: ["incoming-requests"], queryFn: () => f2() });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-4xl font-semibold mb-6">Food requests</h1>
      <Tabs defaultValue="mine">
        <TabsList><TabsTrigger value="mine">My requests</TabsTrigger><TabsTrigger value="incoming">For my donations</TabsTrigger></TabsList>
        <TabsContent value="mine"><RequestList items={mine.data ?? []} canManage={false} /></TabsContent>
        <TabsContent value="incoming"><RequestList items={incoming.data ?? []} canManage /></TabsContent>
      </Tabs>
    </div>
  );
}

function RequestList({ items, canManage }: { items: any[]; canManage: boolean }) {
  const qc = useQueryClient();
  const fn = useServerFn(updateRequestStatus);
  const m = useMutation({
    mutationFn: (v: { id: string; status: any }) => fn({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["incoming-requests"] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      qc.invalidateQueries({ queryKey: ["donations"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Unable to update request. Please try again."),
  });
  if (!items.length) return <p className="text-muted-foreground mt-6">No requests yet.</p>;
  const colors: Record<string, string> = { pending: "bg-accent", approved: "bg-gold text-gold-foreground", fulfilled: "bg-primary text-primary-foreground", rejected: "bg-destructive text-destructive-foreground" };
  return (
    <div className="mt-6 space-y-3">
      {items.map((r) => (
        <Card key={r.id} className="p-5 flex flex-wrap justify-between gap-4 items-center shadow-soft">
          <div>
            <div className="font-display text-lg font-semibold">{r.donations?.food_name}</div>
            <div className="text-sm text-muted-foreground">{r.servings_requested} servings • {r.donations?.pickup_location}</div>
            <div className="text-sm mt-2 space-y-1">
              {r.delivery_address && <div>Delivery: {r.delivery_address}</div>}
              {r.contact_number && <div>Contact: {r.contact_number}</div>}
              {r.preferred_delivery_time && <div>Preferred: {new Date(r.preferred_delivery_time).toLocaleString()}</div>}
              {(r.notes || r.message) && <div>Notes: {r.notes ?? r.message}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={colors[r.status] ?? ""}>{r.status}</Badge>
            {canManage && r.status === "pending" && (
              <>
                <Button size="sm" onClick={() => m.mutate({ id: r.id, status: "approved" })} className="bg-primary text-primary-foreground">Approve</Button>
                <Button size="sm" variant="outline" onClick={() => m.mutate({ id: r.id, status: "rejected" })}>Reject</Button>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
