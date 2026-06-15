import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============ ROLES ============
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.role as string);
  });

export const addMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ role: z.enum(["donor", "beneficiary", "volunteer", "ngo"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles")
      .insert({ user_id: context.userId, role: data.role });
    if (error && !error.message.includes("duplicate")) throw error;
    return { ok: true };
  });

// ============ PROFILE ============
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    full_name: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(30).optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles")
      .update(data).eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============ DONATIONS ============
export const listDonations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("donations").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  });

export const myDonations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("donations")
      .select("*").eq("donor_id", context.userId).order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const DonationSchema = z.object({
  food_name: z.string().trim().min(1).max(120),
  food_type: z.string().trim().min(1).max(60),
  quantity: z.string().trim().min(1).max(60),
  servings: z.number().int().positive().max(10000).optional().nullable(),
  expiry_time: z.string().min(1),
  pickup_location: z.string().trim().min(1).max(300),
  description: z.string().trim().max(1000).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});

export const createDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DonationSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      if (!context.userId) throw new Error("Unauthenticated");

      // Ensure caller has the donor role (RLS requires donor/ngo/admin).
      const { data: roles } = await context.supabase
        .from("user_roles").select("role").eq("user_id", context.userId);
      const has = (r: string) => (roles ?? []).some((x) => x.role === r);
      if (!has("donor") && !has("ngo") && !has("admin")) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: rErr } = await supabaseAdmin.from("user_roles")
          .insert({ user_id: context.userId, role: "donor" });
        if (rErr && !rErr.message.includes("duplicate")) throw rErr;
      }

      const payload = { ...data, donor_id: context.userId, status: "available" as const };
      const { error, data: row } = await context.supabase.from("donations")
        .insert(payload).select().single();
      if (error) {
        console.error("[createDonation] insert failed", { userId: context.userId, payload, error });
        throw error;
      }
      return row;
    } catch (e) {
      console.error("[createDonation] handler exception", e);
      throw e;
    }
  });

export const updateDonationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["available", "reserved", "in_transit", "delivered", "expired", "cancelled"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("donations")
      .update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ REQUESTS ============
export const myRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("food_requests")
      .select("*, donations(*)").eq("beneficiary_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const incomingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId);
    const canReviewAll = (roles ?? []).some((r) => r.role === "ngo" || r.role === "admin");
    if (canReviewAll) {
      const { data, error } = await context.supabase.from("food_requests")
        .select("*, donations(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }

    const { data: myDon } = await context.supabase.from("donations")
      .select("id").eq("donor_id", context.userId);
    const ids = (myDon ?? []).map((d) => d.id);
    if (!ids.length) return [];
    const { data, error } = await context.supabase.from("food_requests")
      .select("*, donations(*)").in("donation_id", ids)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    donation_id: z.string().uuid(),
    servings_requested: z.number().int().positive().max(1000),
    delivery_address: z.string().trim().min(1).max(500),
    contact_number: z.string().trim().min(1).max(30),
    preferred_delivery_time: z.string().datetime().optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      if (!context.userId) throw new Error("Authentication required.");
      console.log("[createRequest] validated input", { userId: context.userId, data });

      const { data: donation, error: donationError } = await context.supabase
        .from("donations")
        .select("id,status")
        .eq("id", data.donation_id)
        .maybeSingle();
      if (donationError) {
        console.error("[createRequest] donation lookup failed", { userId: context.userId, donationId: data.donation_id, error: donationError });
        throw new Error("Unable to create request. Please try again.");
      }
      if (!donation || donation.status !== "available") {
        console.warn("[createRequest] unavailable donation", { userId: context.userId, donationId: data.donation_id, donation });
        throw new Error("Selected donation is no longer available.");
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: roles } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", context.userId);
      const allowed = new Set(["beneficiary", "ngo", "admin", "volunteer"]);
      const hasAllowed = (roles ?? []).some((r) => allowed.has(r.role as string));
      if (!hasAllowed) {
        const { error: rErr } = await supabaseAdmin.from("user_roles")
          .insert({ user_id: context.userId, role: "beneficiary" });
        if (rErr && !rErr.message.includes("duplicate")) {
          console.error("[createRequest] role grant failed", rErr);
          throw new Error("Unable to create request. Please try again.");
        }
      }
      const payload = {
        donation_id: data.donation_id,
        beneficiary_id: context.userId,
        servings_requested: data.servings_requested,
        delivery_address: data.delivery_address,
        contact_number: data.contact_number,
        preferred_delivery_time: data.preferred_delivery_time ?? null,
        notes: data.notes ?? null,
        message: data.notes ?? null,
        request_time: new Date().toISOString(),
        status: "pending" as const,
      };
      console.log("[createRequest] insert payload", { userId: context.userId, payload });
      const response = await context.supabase.from("food_requests")
        .insert(payload).select().single();
      const { error, data: row } = response;
      console.log("[createRequest] Supabase response", { userId: context.userId, response });
      if (error) {
        console.error("[createRequest] insert failed", { userId: context.userId, payload, error });
        throw new Error("Unable to create request. Please try again.");
      }
      console.log("[createRequest] inserted row", { userId: context.userId, row });
      return row;
    } catch (e) {
      console.error("[createRequest] handler exception", e);
      throw e;
    }
  });

export const updateRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected", "fulfilled", "cancelled"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      if (!context.userId) throw new Error("Authentication required.");
      const { error } = await context.supabase.from("food_requests")
        .update({ status: data.status }).eq("id", data.id);
      if (error) {
        console.error("[updateRequestStatus] update failed", { userId: context.userId, input: data, error });
        throw new Error("Unable to update request. Please try again.");
      }
      return { ok: true };
    } catch (e) {
      console.error("[updateRequestStatus] handler exception", e);
      throw e;
    }
  });

// ============ TASKS ============
export const listOpenTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("volunteer_tasks")
      .select("*, donations(food_name, pickup_location)")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  });

export const acceptTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("volunteer_tasks")
      .update({ volunteer_id: context.userId, status: "accepted" })
      .eq("id", data.id).is("volunteer_id", null);
    if (error) throw error;
    return { ok: true };
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "accepted", "picked_up", "delivered", "cancelled"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("volunteer_tasks")
      .update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ ARTICLES (public via admin client) ============
export const listArticles = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("nutrition_articles")
      .select("id,title,slug,category,excerpt,cover_image_url,created_at")
      .eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("nutrition_articles")
      .select("*").eq("slug", data.slug).eq("published", true).maybeSingle();
    if (error) throw error;
    return row;
  });

// ============ ANALYTICS ============
export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [donations, requests, tasks, profiles, roles] = await Promise.all([
      supabaseAdmin.from("donations").select("id,status,servings,created_at"),
      supabaseAdmin.from("food_requests").select("id,status,servings_requested"),
      supabaseAdmin.from("volunteer_tasks").select("id,status"),
      supabaseAdmin.from("profiles").select("id"),
      supabaseAdmin.from("user_roles").select("role"),
    ]);
    const d = donations.data ?? [];
    const r = requests.data ?? [];
    const t = tasks.data ?? [];
    const totalServingsSaved = d
      .filter((x) => x.status === "delivered")
      .reduce((a, b) => a + (b.servings ?? 1), 0);
    // weekly trend
    const days: { day: string; donations: number; requests: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString("en", { weekday: "short" });
      days.push({
        day: label,
        donations: d.filter((x) => x.created_at?.startsWith(key)).length,
        requests: 0,
      });
    }
    return {
      totalDonations: d.length,
      availableDonations: d.filter((x) => x.status === "available").length,
      deliveredDonations: d.filter((x) => x.status === "delivered").length,
      totalRequests: r.length,
      approvedRequests: r.filter((x) => x.status === "approved" || x.status === "fulfilled").length,
      totalTasks: t.length,
      openTasks: t.filter((x) => x.status === "open").length,
      totalUsers: (profiles.data ?? []).length,
      volunteers: (roles.data ?? []).filter((x) => x.role === "volunteer").length,
      ngos: (roles.data ?? []).filter((x) => x.role === "ngo").length,
      totalServingsSaved,
      weeklyTrend: days,
    };
  });
