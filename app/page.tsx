import { FlowLink } from "@/components/FlowLink";

const phaseFlows = [
  {
    title: "Iniciar sesión",
    description: "Entra o crea cuenta con correo y contraseña vía Supabase Auth.",
    href: "/auth",
  },
  {
    title: "Crear compra",
    description: "Define presupuesto en colones y supermercado opcional antes de comprar.",
    href: "/purchases/new",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <section className="rounded-[2rem] bg-presucart-tinta p-6 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">PresuCart</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight">Fase 2: compra autenticada y entrada manual de precios.</h1>
        <p className="mt-4 text-base leading-7 text-emerald-50">
          Inicia sesión, crea una compra con presupuesto CRC y agrega precios manualmente mientras ves gastado, disponible y alertas.
        </p>
        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <p className="text-sm text-emerald-100">Estado actual</p>
          <p className="mt-1 text-3xl font-bold">Supabase Auth + carrito manual</p>
        </div>
      </section>

      <section className="mt-8 space-y-3" aria-labelledby="flujos-fase-2">
        <h2 id="flujos-fase-2" className="text-xl font-bold text-presucart-tinta">
          Empezar
        </h2>
        {phaseFlows.map((flow) => (
          <FlowLink key={flow.title} title={flow.title} description={flow.description} href={flow.href} />
        ))}
      </section>
    </main>
  );
}
