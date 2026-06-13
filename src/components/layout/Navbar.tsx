import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, LogOut, User as UserIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 glass border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold text-primary">
          <span className="size-9 rounded-full bg-gold-gradient grid place-items-center text-gold-foreground shadow-soft">
            <Leaf className="size-5" />
          </span>
          Annapurna
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/" className="px-3 py-2 rounded-md hover:bg-accent/60 [&.active]:text-primary [&.active]:font-medium">Home</Link>
          <Link to="/articles" className="px-3 py-2 rounded-md hover:bg-accent/60 [&.active]:text-primary [&.active]:font-medium">Nutrition</Link>
          {user && <>
            <Link to="/dashboard" className="px-3 py-2 rounded-md hover:bg-accent/60 [&.active]:text-primary [&.active]:font-medium">Dashboard</Link>
            <Link to="/donations" className="px-3 py-2 rounded-md hover:bg-accent/60 [&.active]:text-primary [&.active]:font-medium">Donations</Link>
            <Link to="/requests" className="px-3 py-2 rounded-md hover:bg-accent/60 [&.active]:text-primary [&.active]:font-medium">Requests</Link>
            <Link to="/tasks" className="px-3 py-2 rounded-md hover:bg-accent/60 [&.active]:text-primary [&.active]:font-medium">Tasks</Link>
            <Link to="/assistant" className="px-3 py-2 rounded-md hover:bg-accent/60 [&.active]:text-primary [&.active]:font-medium">AI Guide</Link>
          </>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile"><Button variant="ghost" size="sm"><UserIcon className="size-4" /></Button></Link>
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="size-4" /></Button>
            </>
          ) : (
            <Link to="/auth"><Button size="sm" className="bg-primary text-primary-foreground">Sign in</Button></Link>
          )}
        </div>
      </div>
    </header>
  );
}
