import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { onSaved } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AIBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border bg-highlight px-2 py-0.5 text-[11px] font-medium text-highlight-foreground", className)}>
      <ShieldAlert className="h-3 w-3" /> AI-generated · Verify before use
    </span>
  );
}

export function SavedIndicator() {
  const [t, setT] = useState(0);
  useEffect(() => onSaved(setT), []);
  const [show, setShow] = useState(false);
  useEffect(() => { if (!t) return; setShow(true); const h = setTimeout(() => setShow(false), 1400); return () => clearTimeout(h); }, [t]);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground transition-opacity duration-300", show ? "opacity-100" : "opacity-0")} aria-live="polite">
      <Check className="h-3 w-3 text-success" /> Saved
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, icon, actions, children, className, delay = 0 }: { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay }} className={cn("surface p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function RegenButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={loading} className="h-7 gap-1 px-2 text-xs text-muted-foreground">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
    </Button>
  );
}

export function GeneratingState({ label }: { label: string }) {
  return (
    <div className="space-y-3 py-2" role="status">
      <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>
      {[90, 75, 82].map((w, i) => <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "high" | "medium" | "low" | "success" }) {
  const tones = {
    default: "bg-muted text-muted-foreground",
    high: "bg-destructive/10 text-destructive",
    medium: "bg-warning/15 text-highlight-foreground",
    low: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", tones[tone])}>{children}</span>;
}

export const confTone = (c: string) => (c === "High" ? "success" : c === "Medium" ? "medium" : "high") as "success" | "medium" | "high";
