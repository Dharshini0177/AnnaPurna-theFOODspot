import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Sparkles, Users, Utensils, Leaf, Shield } from "lucide-react";
import heroImg from "@/assets/hero-food.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Annapurna — Share food, share hope" },
    { name: "description", content: "A platform connecting food donors, beneficiaries, volunteers, and NGOs. Powered by an AI Nutrition Guide." },
    { property: "og:title", content: "Annapurna — Share food, share hope" },
    { property: "og:description", content: "Reduce food waste, feed your community, learn nutrition." },
  ]}),
  component: Home,
});

function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" className="h-full w-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-hero-gradient" />
        </div>
        <div className="container mx-auto px-4 py-24 md:py-36 text-primary-foreground">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-dark text-sm">
              <Sparkles className="size-4 text-gold" /> Smart food redistribution & nutrition
            </span>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold text-balance leading-[1.05]">
              Share a meal. <span className="text-gold">Save a life.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-2xl">
              Annapurna connects donors with surplus food to families and NGOs nearby — while teaching the
              fundamentals of balanced nutrition through an AI-powered guide.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth"><Button size="lg" className="bg-gold-gradient text-gold-foreground hover:opacity-95 shadow-warm">
                Get started <ArrowRight className="ml-1 size-4" /></Button></Link>
              <Link to="/articles"><Button size="lg" variant="outline" className="border-primary-foreground/30 bg-white/5 text-primary-foreground hover:bg-white/10">
                Learn nutrition</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: "1.3B", l: "tonnes food wasted yearly" },
            { n: "828M", l: "people facing hunger" },
            { n: "5", l: "user roles supported" },
            { n: "24/7", l: "AI nutrition guide" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-6 shadow-soft">
              <div className="font-display text-3xl md:text-4xl font-semibold text-primary">{s.n}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-balance">
            A complete platform for food justice
          </h2>
          <p className="mt-4 text-muted-foreground">Five roles. One mission. Reduce waste, feed neighbors, build awareness.</p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            { i: Utensils, t: "Donate surplus food", d: "List meals, groceries, and prepared food with photos, expiry, and pickup details in under a minute." },
            { i: Heart, t: "Request what you need", d: "Beneficiaries browse nearby donations and request fairly with transparent status tracking." },
            { i: Users, t: "Volunteer logistics", d: "Volunteers accept pickup tasks and mark deliveries, closing the loop end-to-end." },
            { i: Shield, t: "NGO oversight", d: "NGOs approve distributions, monitor flow, and ensure trust between donors and beneficiaries." },
            { i: Sparkles, t: "AI Nutrition Guide", d: "Ask anything — balanced diets, iron-rich foods, meals under ₹100. Powered by Lovable AI." },
            { i: Leaf, t: "Awareness blog", d: "Curated articles on nutrition, sustainability, and healthy living for every household." },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card border p-6 shadow-soft hover:shadow-warm transition-shadow">
              <div className="size-12 rounded-xl bg-warm-gradient grid place-items-center text-primary mb-4">
                <f.i className="size-6" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="rounded-3xl bg-gold-gradient p-10 md:p-16 text-gold-foreground shadow-warm text-center">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-balance">Every meal shared is hope delivered.</h2>
          <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">Join Annapurna as a donor, beneficiary, volunteer, or NGO.</p>
          <Link to="/auth"><Button size="lg" className="mt-8 bg-primary text-primary-foreground hover:opacity-95">Create your account</Button></Link>
        </div>
      </section>
    </div>
  );
}
