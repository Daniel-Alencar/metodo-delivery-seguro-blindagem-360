import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { User, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Blindagem 360º" }] }),
  component: PerfilPage,
});

type Profile = {
  id: string; full_name: string | null; cpf: string | null;
  company_name: string | null; cnpj: string | null; phone: string | null;
};

function PerfilPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile((data ?? null) as Profile | null);
      setLoading(false);
    })();
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true); setSavedMsg(null);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, company_name: profile.company_name,
      cnpj: profile.cnpj, phone: profile.phone,
    }).eq("id", profile.id);
    setSaving(false);
    setSavedMsg(error ? `Erro: ${error.message}` : "Dados atualizados.");
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (password.length < 6) { setPwMsg({ type: "err", text: "A senha deve ter no mínimo 6 caracteres." }); return; }
    if (password !== confirm) { setPwMsg({ type: "err", text: "As senhas não coincidem." }); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPwLoading(false);
    if (error) { setPwMsg({ type: "err", text: error.message }); return; }
    setPassword(""); setConfirm("");
    setPwMsg({ type: "ok", text: "Senha alterada com sucesso." });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando perfil...</div>;
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Conta</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Meu perfil</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Gerencie seus dados de cadastro e altere sua senha de acesso.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card/60 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold"><User className="h-4 w-4" /> Dados cadastrais</h2>
          <form onSubmit={saveProfile} className="mt-5 space-y-4">
            <Field label="Nome completo" value={profile?.full_name ?? ""} onChange={(v) => setProfile((p) => p ? { ...p, full_name: v } : p)} />
            <Field label="CPF" value={profile?.cpf ?? ""} readOnly />
            <Field label="E-mail" value={user?.email ?? ""} readOnly />
            <Field label="Empresa / razão social" value={profile?.company_name ?? ""} onChange={(v) => setProfile((p) => p ? { ...p, company_name: v } : p)} />
            <Field label="Telefone (WhatsApp)" value={profile?.phone ?? ""} onChange={(v) => setProfile((p) => p ? { ...p, phone: v } : p)} />
            {savedMsg && <p className="text-sm text-emerald-300">{savedMsg}</p>}
            <button type="submit" disabled={saving} className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold"><KeyRound className="h-4 w-4" /> Alterar senha</h2>
          <p className="mt-1 text-xs text-muted-foreground">Escolha uma nova senha com no mínimo 6 caracteres.</p>
          <form onSubmit={changePassword} className="mt-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Nova senha</label>
              <div className="mt-1"><PasswordInput value={password} onChange={setPassword} required autoComplete="new-password" /></div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar nova senha</label>
              <div className="mt-1"><PasswordInput value={confirm} onChange={setConfirm} required autoComplete="new-password" /></div>
            </div>
            {pwMsg && <p className={`text-sm ${pwMsg.type === "ok" ? "text-emerald-300" : "text-red-300"}`}>{pwMsg.text}</p>}
            <button type="submit" disabled={pwLoading} className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50">
              {pwLoading ? "Alterando..." : "Alterar senha"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, readOnly,
}: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)}
        className={`mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-foreground/40 ${readOnly ? "opacity-70" : ""}`}
      />
    </div>
  );
}
