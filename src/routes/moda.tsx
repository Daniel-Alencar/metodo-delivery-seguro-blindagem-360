import { createFileRoute } from "@tanstack/react-router";
import { AreaTeaser } from "@/components/AreaTeaser";
import hero from "@/assets/moda-hero.jpg";

export const Route = createFileRoute("/moda")({
  head: () => ({
    meta: [
      { title: "Atacado & Varejo de Moda — Blindagem 360º (Em breve)" },
      { name: "description", content: "Blindagem para marcas, atacadistas e varejistas de moda." },
    ],
  }),
  component: () => (
    <AreaTeaser
      vertical="moda"
      eyebrow="Em construção"
      title="Atacado & Varejo de Moda"
      tagline="Para marcas, atacadistas e varejistas que vivem de coleção, fornecedor e marketplace."
      description="Blindagem 360º para o ecossistema da moda: contratos com fornecedores, propriedade intelectual de coleções, marketplaces, política de troca, devolução, fiscal, trabalhista e proteção de marca."
      image={hero}
      glow="oklch(0.78 0.17 280)"
      accent="from-violet-500/20 via-indigo-500/10 to-transparent"
      pillars={[
        { title: "Contratos B2B", desc: "Atacado, representação, consignação e indústria com cláusulas vivas." },
        { title: "Marca & Coleção", desc: "Registro, autoria, fotografia e proteção de design exclusivo." },
        { title: "Marketplace", desc: "Termos das plataformas, precificação, denúncia e reputação." },
        { title: "Operação & Fiscal", desc: "Estoque, devolução, troca e governança fiscal aplicada." },
      ]}
    />
  ),
});
