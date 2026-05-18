import { useState } from "react";
import { BellRing, Loader2, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Vertical = "estetica" | "hof" | "moda" | "food-service";

export function LeadCaptureButton({ vertical, label = "Avise-me", areaName }: { vertical: Vertical; label?: string; areaName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
      >
        <BellRing className="h-4 w-4" />
        {label}
      </button>
      {open && <LeadModal vertical={vertical} areaName={areaName} onClose={() => setOpen(false)} />}
    </>
  );
}

function LeadModal({ vertical, areaName, onClose }: { vertical: Vertical; areaName: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setError("Informe nome e e-mail.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.from("vertical_leads").insert({
      vertical,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError("Não foi possível registrar agora. Tente novamente.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h3 className="mt-4 text-lg font-semibold">Tudo certo!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Você está na lista de espera de <span className="font-medium text-foreground">{areaName}</span>. Avisamos assim que abrir.
            </p>
            <button onClick={onClose} className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background">
              Fechar
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold tracking-tight">Lista de espera · {areaName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Avisamos por e-mail e WhatsApp quando o Blindagem 360º para {areaName} estiver disponível.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Field label="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Como podemos te chamar?" />
              <Field label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="voce@exemplo.com" />
              <Field label="Telefone / WhatsApp (opcional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(11) 99999-9999" />
              {error && <p className="text-xs text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                Quero ser avisado
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
    </div>
  );
}
