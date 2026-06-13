import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/dashboard" }),
  head: () => ({ meta: [{ title: "Sign in — Annapurna" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) { toast.error(r.error.message); setLoading(false); return; }
    if (r.redirected) return;
    navigate({ to: redirect });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-12 bg-warm-gradient">
      <Card className="w-full max-w-md shadow-warm border-0 glass">
        <CardHeader className="text-center">
          <div className="size-12 rounded-full bg-gold-gradient grid place-items-center mx-auto text-gold-foreground"><Leaf className="size-6" /></div>
          <CardTitle className="font-display text-2xl mt-2">Welcome to Annapurna</CardTitle>
          <CardDescription>Sign in to share or receive food.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full mb-4">Continue with Google</Button>
          <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or email</span></div></div>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Sign up</TabsTrigger></TabsList>
            <TabsContent value="signin"><SignIn onDone={() => navigate({ to: redirect })} /></TabsContent>
            <TabsContent value="signup"><SignUp onDone={() => navigate({ to: redirect })} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!"); onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-3 mt-4">
      <div><Label htmlFor="e1">Email</Label><Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label htmlFor="p1">Password</Label><Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">{loading ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function SignUp({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "beneficiary", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.object({
      full_name: z.string().trim().min(1).max(120),
      email: z.string().trim().email(),
      password: z.string().min(8).max(100),
      role: z.enum(["donor", "beneficiary", "volunteer", "ngo"]),
      phone: z.string().trim().max(30).optional(),
      address: z.string().trim().max(500).optional(),
    }).safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email, password: parsed.data.password,
      options: { emailRedirectTo: window.location.origin, data: parsed.data },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!"); onDone();
  }
  return (
    <form onSubmit={submit} className="space-y-3 mt-4">
      <div><Label>Full name</Label><Input required maxLength={120} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
      <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><Label>Password</Label><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
      <div><Label>I am a…</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="donor">Donor</SelectItem>
            <SelectItem value="beneficiary">Beneficiary</SelectItem>
            <SelectItem value="volunteer">Volunteer</SelectItem>
            <SelectItem value="ngo">NGO</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Phone (optional)</Label><Input maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div><Label>Address (optional)</Label><Input maxLength={500} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground">{loading ? "Creating…" : "Create account"}</Button>
    </form>
  );
}
