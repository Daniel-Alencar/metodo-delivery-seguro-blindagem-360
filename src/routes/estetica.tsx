import { createFileRoute } from "@tanstack/react-router";
import { AreaTeaser } from "@/components/AreaTeaser";
import hero from "@/assets/estetica-hero.jpg";

export const Route = createFileRoute("/estetica")({
  head: () => ({
    meta: [
      { title: "Estética — Blindagem 360º (Em breve)" },
      { name: "description", content: "Blindagem jurídica e operacional para clínicas e profissionais de estética." },
    ],
  }),
  component: () => (
    <AreaTeaser
      vertical="estetica"
      eyebrow="Em construção"
      title="Estética"
      tagline="Para clínicas e profissionais que tratam pele, corpo e autoestima."
      description="O mesmo Método Blindagem 360º — agora desenhado para o universo da estética: contratos com pacientes, consentimentos informados, prontuário, marketing responsável e proteção contra reclamações no Procon e nos conselhos."
      image={hero}
      glow="oklch(0.78 0.16 330)"
      accent="from-pink-500/20 via-fuchsia-500/10 to-transparent"
      pillars={[
        { title: "Termos & Consentimentos", desc: "Modelos contextualizados por procedimento, com versão e evidência." },
        { title: "Prontuário Probatório", desc: "Estrutura de registro que vira prova em qualquer contestação." },
        { title: "Marketing Sem Risco", desc: "Roteiros, antes/depois e conformidade com órgãos reguladores." },
        { title: "Central de Incidentes", desc: "Protocolos para Procon, conselhos profissionais e mídias sociais." },
      ]}
    />
  ),
});
