import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDonations, createDonation, createRequest } from "@/lib/db.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, MapPin, Package, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/donations")({
  head: () => ({ meta: [{ title: "Donations — Annapurna" }] }),
  component: Donations,
});

function Donations() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listDonations);
  const { data } = useQuery({ queryKey: ["donations"], queryFn: () => fetchFn() });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Food donations</h1>
          <p className="text-muted-foreground mt-1">Browse available food. Tap a card to request.</p>
        </div>
        <NewDonationDialog onCreated={() => qc.invalidateQueries({ queryKey: ["donations"] })} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data ?? []).map((d) => <DonationCard key={d.id} d={d} />)}
        {data && data.length === 0 && <p className="text-muted-foreground">No donations yet — be the first to share.</p>}
      </div>
    </div>
  );
}

function DonationCard({ d }: { d: any }) {
  const [open, setOpen] = useState(false);
  const [servings, setServings] = useState(1);
  const [message, setMessage] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const reqFn = useServerFn(createRequest);
  const m = useMutation({
    mutationFn: () => reqFn({ data: { donation_id: d.id, servings_requested: servings, message, delivery_address: deliveryAddress } }),
    onSuccess: () => { toast.success("Request submitted"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const statusColors: Record<string, string> = {
    available: "bg-gold text-gold-foreground", reserved: "bg-accent", in_transit: "bg-secondary",
    delivered: "bg-primary text-primary-foreground", expired: "bg-muted", cancelled: "bg-destructive text-destructive-foreground",
  };
  return (
    <Card className="overflow-hidden shadow-soft hover:shadow-warm transition-shadow">
      {d.image_url && <img src={d.image_url} alt={d.food_name} className="w-full h-44 object-cover" loading="lazy" />}
      <div className="p-5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-display text-lg font-semibold">{d.food_name}</h3>
          <Badge className={statusColors[d.status] ?? ""}>{d.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{d.food_type} • {d.quantity}</p>
        {d.description && <p className="text-sm mt-2 line-clamp-2">{d.description}</p>}
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1"><MapPin className="size-3" />{d.pickup_location}</div>
          <div className="flex items-center gap-1"><Clock className="size-3" />Expires {new Date(d.expiry_time).toLocaleString()}</div>
          {d.servings && <div className="flex items-center gap-1"><Package className="size-3" />{d.servings} servings</div>}
        </div>
        {d.status === "available" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="w-full mt-4 bg-primary text-primary-foreground">Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request {d.food_name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Servings needed</Label><Input type="number" min={1} value={servings} onChange={(e) => setServings(+e.target.value)} /></div>
                <div><Label>Delivery address</Label><Textarea required maxLength={500} placeholder="Where should the food be delivered?" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} /></div>
                <div><Label>Message (optional)</Label><Textarea maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
                <Button onClick={() => m.mutate()} disabled={m.isPending || !deliveryAddress.trim()} className="w-full bg-primary text-primary-foreground">
                  {m.isPending ? "Submitting…" : "Submit request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Card>
  );
}

function NewDonationDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    food_name: "", food_type: "Cooked meal", quantity: "", servings: 1,
    expiry_time: "", pickup_location: "", description: "", image_url: "",
  });
  const fn = useServerFn(createDonation);
  const m = useMutation({
    mutationFn: () => fn({ data: {
      ...form,
      servings: form.servings || null,
      expiry_time: new Date(form.expiry_time).toISOString(),
      image_url: form.image_url || null,
      description: form.description || null,
    } as any }),
    onSuccess: () => { toast.success("Donation listed!"); setOpen(false); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-primary text-primary-foreground"><Plus className="size-4 mr-1" />New donation</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>List food for donation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Food name</Label><Input required value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Input value={form.food_type} onChange={(e) => setForm({ ...form, food_type: e.target.value })} /></div>
            <div><Label>Quantity</Label><Input placeholder="e.g. 5 kg" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          </div>
          <div><Label>Servings</Label><Input type="number" min={1} value={form.servings} onChange={(e) => setForm({ ...form, servings: +e.target.value })} /></div>
          <div><Label>Expiry time</Label><Input type="datetime-local" required value={form.expiry_time} onChange={(e) => setForm({ ...form, expiry_time: e.target.value })} /></div>
          <div><Label>Pickup location</Label><Input required value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} /></div>
          <div><Label>Image URL (optional)</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <Button onClick={() => m.mutate()} disabled={m.isPending} className="w-full bg-primary text-primary-foreground">
            {m.isPending ? "Publishing…" : "Publish donation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
