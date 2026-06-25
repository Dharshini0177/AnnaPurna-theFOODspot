import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowInput = {
  donationCreatedAt?: string | null;
  requestCreatedAt?: string | null;
  requestStatus?: string | null;
  taskVolunteerId?: string | null;
  taskAcceptedAt?: string | null;
  pickupTime?: string | null;
  deliveryTime?: string | null;
  donationStatus?: string | null;
  taskStatus?: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

export function WorkflowTimeline(props: WorkflowInput) {
  const {
    donationCreatedAt, requestCreatedAt, requestStatus,
    taskVolunteerId, pickupTime, deliveryTime, donationStatus, taskStatus,
  } = props;

  const steps = [
    { label: "Donation created", done: !!donationCreatedAt, at: donationCreatedAt },
    { label: "Request submitted", done: !!requestCreatedAt, at: requestCreatedAt },
    {
      label: "NGO approved",
      done: ["approved", "fulfilled"].includes(requestStatus ?? "") || !!taskVolunteerId || !!pickupTime || !!deliveryTime,
    },
    {
      label: "Volunteer assigned",
      done: !!taskVolunteerId || ["picked_up", "delivered"].includes(taskStatus ?? "") || !!pickupTime || !!deliveryTime,
    },
    {
      label: "Picked up",
      done: !!pickupTime || ["picked_up", "delivered"].includes(taskStatus ?? "") || donationStatus === "in_transit" || donationStatus === "delivered",
      at: pickupTime,
    },
    {
      label: "Delivered",
      done: !!deliveryTime || taskStatus === "delivered" || donationStatus === "delivered" || requestStatus === "fulfilled",
      at: deliveryTime,
    },
  ];

  return (
    <ol className="mt-3 space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <span
            className={cn(
              "mt-0.5 flex size-4 items-center justify-center rounded-full border",
              s.done ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted-foreground/30 text-muted-foreground",
            )}
          >
            {s.done ? <Check className="size-2.5" /> : <Circle className="size-1.5 fill-current" />}
          </span>
          <span className={cn("flex-1", s.done ? "text-foreground" : "text-muted-foreground")}>
            <span className="font-medium">{s.label}</span>
            {s.at && <span className="ml-2 text-muted-foreground">{fmt(s.at)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
