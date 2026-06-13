import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOpenTasks, acceptTask, updateTaskStatus } from "@/lib/db.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Volunteer tasks — Annapurna" }] }),
  component: Tasks,
});

function Tasks() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listOpenTasks);
  const acceptFn = useServerFn(acceptTask);
  const updFn = useServerFn(updateTaskStatus);
  const { data } = useQuery({ queryKey: ["tasks"], queryFn: () => fetchFn() });
  const accept = useMutation({
    mutationFn: (id: string) => acceptFn({ data: { id } }),
    onSuccess: () => { toast.success("Task accepted!"); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
  const upd = useMutation({
    mutationFn: (v: { id: string; status: any }) => updFn({ data: v }),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Truck className="text-primary size-7" />
        <h1 className="font-display text-4xl font-semibold">Volunteer tasks</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {(data ?? []).map((t: any) => (
          <Card key={t.id} className="p-5 shadow-soft">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold">{t.donations?.food_name ?? "Pickup task"}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="size-3" />{t.pickup_location}</p>
                {t.drop_location && <p className="text-sm text-muted-foreground">→ {t.drop_location}</p>}
              </div>
              <Badge>{t.status}</Badge>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {t.status === "open" && <Button size="sm" onClick={() => accept.mutate(t.id)} className="bg-primary text-primary-foreground">Accept</Button>}
              {t.status === "accepted" && <Button size="sm" onClick={() => upd.mutate({ id: t.id, status: "picked_up" })}>Mark picked up</Button>}
              {t.status === "picked_up" && <Button size="sm" onClick={() => upd.mutate({ id: t.id, status: "delivered" })} className="bg-gold text-gold-foreground">Mark delivered</Button>}
            </div>
          </Card>
        ))}
        {data && !data.length && <p className="text-muted-foreground">No open tasks right now.</p>}
      </div>
    </div>
  );
}
