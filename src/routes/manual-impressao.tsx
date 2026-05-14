import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/manual-impressao")({
  head: () => ({ meta: [{ title: "Manual completo — Blindagem 360º" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: ManualPage,
});

type Module = { id: string; month_index: number; title: string };
type Week = { id: string; module_id: string; week_index: number; title: string };
type Doc = { id: string; title: string; description: string | null; body: string | null; week_id: string | null };

function formatCpf(raw: string | null | undefined) {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function ManualPage() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("full_name, company_name, cpf").eq("id", u.user!.id).maybeSingle();
      setName(prof?.full_name || prof?.company_name || u.user!.email || "");
      setCpf(formatCpf(prof?.cpf));

      const [{ data: m }, { data: w }, { data: d }] = await Promise.all([
        supabase.from("modules").select("id, month_index, title").eq("vertical", "food-service").order("month_index"),
        supabase.from("weeks").select("id, module_id, week_index, title").order("week_index"),
        supabase.from("documents").select("id, title, description, body, week_id").order("created_at"),
      ]);
      setModules((m ?? []) as Module[]);
      setWeeks((w ?? []) as Week[]);
      setDocs((d ?? []) as Doc[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Montando manual...</div>;
  }

  const watermark = cpf || "USO EXCLUSIVO";

  return (
    <div className="bg-white text-black min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          body { background: white; }
          .watermark-layer { position: fixed !important; }
        }
        @page {
          size: A4;
          margin: 18mm 14mm 24mm 14mm;
          @bottom-center {
            content: "Uso EXCLUSIVO de ${name.replace(/"/g, "")} — CPF ${watermark} — Proibida a reprodução (responsabilização civil e criminal)";
            font-size: 8pt;
            color: #888;
          }
        }
      `}</style>

      {/* Marca d'água repetida em diagonal — visível na tela e na impressão */}
      <div
        aria-hidden
        className="watermark-layer pointer-events-none fixed inset-0 z-[1] overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(-30deg, transparent 0 180px, rgba(0,0,0,0.04) 180px 181px)`,
        }}
      >
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-6 gap-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center">
              <span
                className="select-none text-[14px] font-semibold uppercase tracking-widest text-black/[0.06]"
                style={{ transform: "rotate(-30deg)" }}
              >
                {watermark} · {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-3">
        <p className="text-sm">Use <b>Ctrl+P</b> (ou Cmd+P) e escolha <b>Salvar como PDF</b>.</p>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-medium text-white"
        >
          <Printer className="h-3.5 w-3.5" /> Imprimir / Salvar PDF
        </button>
      </div>

      <main className="mx-auto max-w-3xl px-8 py-12">
        {/* Capa */}
        <section className="page-break flex min-h-[80vh] flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Blindagem 360º</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight">Método Delivery Seguro™</h1>
          <p className="mt-3 text-lg text-gray-700">Manual Completo — 40 Modelos</p>
          <div className="mt-12 text-sm text-gray-700">
            <p className="font-medium">{name}</p>
            <p className="text-gray-500">CPF {watermark}</p>
            <p className="mt-1 text-gray-500">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <p className="mt-12 max-w-md text-[11px] leading-relaxed text-gray-500">
            Método desenvolvido por <b className="text-gray-700">Dr. Glauber Tiago Giachetta</b>. Documento de uso
            estritamente pessoal. <b>Proibida a reprodução, redistribuição ou compartilhamento</b>, sob pena de
            responsabilização civil e criminal (Lei 9.610/98 e arts. 184 e ss. do CP).
          </p>
        </section>

        {/* Sumário */}
        <section className="page-break mt-8">
          <h2 className="border-b border-gray-300 pb-2 text-2xl font-bold">Sumário</h2>
          <div className="mt-4 space-y-4 text-sm">
            {modules.map((m) => (
              <div key={m.id}>
                <p className="font-semibold">Módulo {m.month_index} — {m.title}</p>
                <ul className="ml-4 mt-1 list-disc text-gray-700">
                  {weeks.filter((w) => w.module_id === m.id).map((w) => {
                    const cnt = docs.filter((d) => d.week_id === w.id).length;
                    return <li key={w.id}>Encontro {w.week_index} — {w.title} <span className="text-gray-500">({cnt} {cnt === 1 ? "modelo" : "modelos"})</span></li>;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Modelos por encontro */}
        {modules.map((m) => (
          <section key={m.id} className="mt-12">
            <h2 className="border-b-2 border-black pb-2 text-3xl font-bold">Módulo {m.month_index} — {m.title}</h2>
            {weeks.filter((w) => w.module_id === m.id).map((w) => {
              const wDocs = docs.filter((d) => d.week_id === w.id);
              if (wDocs.length === 0) return null;
              return (
                <div key={w.id} className="mt-6">
                  <h3 className="text-xl font-semibold">Encontro {w.week_index} — {w.title}</h3>
                  {wDocs.map((d) => (
                    <article key={d.id} className="mt-5 break-inside-avoid">
                      <h4 className="text-base font-bold">{d.title}</h4>
                      {d.description && <p className="mt-1 text-sm italic text-gray-600">{d.description}</p>}
                      <pre className="mt-3 whitespace-pre-wrap rounded border border-gray-300 bg-gray-50 p-3 text-[11px] leading-relaxed font-sans">
{d.body || "(modelo sem conteúdo cadastrado)"}
                      </pre>
                    </article>
                  ))}
                </div>
              );
            })}
          </section>
        ))}

        {/* Modelos sem encontro (biblioteca geral) */}
        {(() => {
          const general = docs.filter((d) => !d.week_id);
          if (general.length === 0) return null;
          return (
            <section className="mt-12">
              <h2 className="border-b-2 border-black pb-2 text-3xl font-bold">Biblioteca geral</h2>
              {general.map((d) => (
                <article key={d.id} className="mt-5 break-inside-avoid">
                  <h4 className="text-base font-bold">{d.title}</h4>
                  {d.description && <p className="mt-1 text-sm italic text-gray-600">{d.description}</p>}
                  <pre className="mt-3 whitespace-pre-wrap rounded border border-gray-300 bg-gray-50 p-3 text-[11px] leading-relaxed font-sans">
{d.body || "(modelo sem conteúdo cadastrado)"}
                  </pre>
                </article>
              ))}
            </section>
          );
        })()}

        <footer className="mt-20 border-t border-gray-300 pt-4 text-center text-[11px] leading-relaxed text-gray-500">
          <p>Blindagem 360º — Método Delivery Seguro™ — © 2026 Dr. Glauber Tiago Giachetta. ® Proibida a reprodução.</p>
          <p className="mt-1">
            Documento de uso EXCLUSIVO de <b>{name}</b> — CPF <b>{watermark}</b>. Reprodução, redistribuição ou
            compartilhamento sujeitos a responsabilização <b>civil e criminal</b>.
          </p>
        </footer>
      </main>
    </div>
  );
}
