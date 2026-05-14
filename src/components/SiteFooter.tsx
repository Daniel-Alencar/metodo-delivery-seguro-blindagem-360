import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-muted-foreground">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-semibold text-foreground">Blindagem 360º</p>
            <p className="mt-2 leading-relaxed">
              Método desenvolvido por <span className="font-medium text-foreground">Dr. Glauber Tiago Giachetta</span>.
              Proibida a reprodução, redistribuição ou uso comercial sem autorização expressa.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Documentos</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link to="/manual" className="hover:text-foreground">Manual completo do sistema</Link></li>
              <li><Link to="/termos" className="hover:text-foreground">Termos de uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground">Política de privacidade (LGPD)</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Contato</p>
            <p className="mt-2">Suporte e dúvidas pelo seu mentor designado dentro da plataforma.</p>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 md:flex-row">
          <p>© 2026 Blindagem 360º — Dr. Glauber Tiago Giachetta. Todos os direitos reservados.</p>
          <p className="uppercase tracking-wider">® Proibida a reprodução</p>
        </div>
      </div>
    </footer>
  );
}
