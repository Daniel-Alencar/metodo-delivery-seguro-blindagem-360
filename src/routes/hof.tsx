import { createFileRoute } from "@tanstack/react-router";
import { AreaTeaser } from "@/components/AreaTeaser";
import hero from "@/assets/hof-hero.jpg";

export const Route = createFileRoute("/hof")({
  head: () => ({
    meta: [
      { title: "HOF & Procedimentos Médicos Estéticos — Blindagem 360º (Em breve)" },
      { name: "description", content: "Blindagem regulatória, técnica e probatória para HOF e procedimentos médicos estéticos." },
    ],
  }),
  component: () => (
    <AreaTeaser
      vertical="hof"
      eyebrow="Em construção"
      title="HOF — Harmonização Orofacial"
      tagline="Procedimentos médicos estéticos com proteção regulatória, técnica e probatória."
      description="Blindagem 360º especializada para profissionais de HOF e procedimentos médicos estéticos. Regulação, conselho de classe, anvisa, prescrição, evidência clínica e defesa em ações de responsabilidade civil."
      image={hero}
      glow="oklch(0.78 0.16 200)"
      accent="from-cyan-500/20 via-sky-500/10 to-transparent"
      pillars={[
        { title: "Conformidade Regulatória", desc: "Conselhos profissionais, Anvisa, publicidade e habilitação." },
        { title: "Documentação Clínica", desc: "Anamnese, fotos padronizadas, evolução e termos específicos." },
        { title: "Defesa em RCv", desc: "Estrutura probatória que sustenta o profissional em juízo." },
        { title: "Crise & Reputação", desc: "Plano de resposta para mídias sociais e exposições públicas." },
      ]}
    />
  ),
});
