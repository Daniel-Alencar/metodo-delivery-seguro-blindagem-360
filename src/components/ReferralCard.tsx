import { useEffect, useState } from "react";
import { Gift, Copy, Check, Loader2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Summary = {
  code: string | null;
  discount_percent: number;
  active: boolean;
  total_referrals: number;
  converted_referrals: number;
  pending_referrals: number;
};

export function ReferralCard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    const { data: rows } = await supabase.rpc("my_referral_summary");
    const row = Array.isArray(rows) ? rows[0] : rows;
    setData(row ? {
      code: row.code ?? null,
      discount_percent: Number(row.discount_percent ?? 0),
      active: !!row.active,
      total_referrals: Number(row.total_referrals ?? 0),
      converted_referrals: Number(row.converted_referrals ?? 0),
      pending_referrals: Number(row.pending_referrals ?? 0),
    } : null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    setCreating(true);
    await supabase.rpc("get_or_create_my_referral_code");
    await load();
    setCreating(false);
  }

  async function copy() {
    if (!data?.code) return;
    const url = `${window.location.origin}/signup?ref=${data.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (!data?.code) return;
    const url = `${window.location.origin}/signup?ref=${data.code}`;
    const text = `Use meu código ${data.code} e ganhe ${data.discount_percent}% de desconto na Blindagem 360º: ${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Blindagem 360º", text, url }); return; } catch { /* ignore */ }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando indicações...
      </div>
    );
  }

  if (!data?.active) return null;

  return (
    <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-card/40 to-card/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-fuchsia-200">
            <Gift className="h-3.5 w-3.5" /> Indique e ganhe
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">
            Cada indicado seu ganha {data.discount_percent}% de desconto
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Compartilhe seu código. Quando a matrícula é ativada, contabiliza para você.
          </p>
        </div>
      </div>

      {!data.code ? (
        <button
          onClick={generate} disabled={creating}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
          Gerar meu código
        </button>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-border bg-background/60 px-3 py-1.5 font-mono text-sm tracking-widest">
              {data.code}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs hover:bg-card"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar link"}
            </button>
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs hover:bg-card"
            >
              <Share2 className="h-3.5 w-3.5" /> Compartilhar
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Total" value={data.total_referrals} />
            <Stat label="Ativados" value={data.converted_referrals} accent="text-emerald-300" />
            <Stat label="Pendentes" value={data.pending_referrals} accent="text-amber-300" />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <p className={`text-lg font-semibold ${accent ?? ""}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
