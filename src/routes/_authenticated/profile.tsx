import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile, getMyRoles, addMyRole } from "@/lib/db.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Annapurna" }] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const pFn = useServerFn(getMyProfile);
  const uFn = useServerFn(updateMyProfile);
  const rFn = useServerFn(getMyRoles);
  const aFn = useServerFn(addMyRole);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => pFn() });
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rFn() });

  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  useEffect(() => { if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", address: profile.address ?? "" }); }, [profile]);

  const save = useMutation({
    mutationFn: () => uFn({ data: form }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const [newRole, setNewRole] = useState("donor");
  const addRole = useMutation({
    mutationFn: () => aFn({ data: { role: newRole as any } }),
    onSuccess: () => { toast.success("Role added"); qc.invalidateQueries({ queryKey: ["my-roles"] }); },
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="font-display text-4xl font-semibold mb-6">My profile</h1>
      <Card className="p-6 shadow-soft space-y-4">
        <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-primary text-primary-foreground">Save changes</Button>
      </Card>

      <Card className="p-6 shadow-soft mt-6">
        <h2 className="font-display text-xl font-semibold mb-3">My roles</h2>
        <div className="flex gap-2 flex-wrap mb-4">
          {(roles ?? []).map((r) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
        </div>
        <div className="flex gap-2">
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="donor">Donor</SelectItem>
              <SelectItem value="beneficiary">Beneficiary</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="ngo">NGO</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => addRole.mutate()} variant="outline">Add role</Button>
        </div>
      </Card>
    </div>
  );
}
