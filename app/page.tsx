import { FlowLink } from "@/components/FlowLink";

const nextFlows = [
  {
    title: "Crear compra",
    description: "Próximo flujo: definir presupuesto en colones y supermercado opcional.",
  },
  {
    title: "Modo compra",
    description: "Próximo flujo: ver disponible, gastado y barra de progreso siempre visibles.",
  },
  {
    title: "Escanear precio",
    description: "Próximo flujo: cámara/OCR temporal con confirmación antes de agregar.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <section className="rounded-[2rem] bg-presucart-tinta p-6 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">PresuCart</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight">Fase 1 lista para construir tu compra móvil.</h1>
        <p className="mt-4 text-base leading-7 text-emerald-50">
          Proyecto base, dominio de presupuesto, parser de precios CRC y esquema inicial de Supabase preparados.
        </p>
        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <p className="text-sm text-emerald-100">Moneda inicial</p>
          <p className="mt-1 text-3xl font-bold">₡ Colones CRC</p>
        </div>
      </section>

      <section className="mt-8 space-y-3" aria-labelledby="siguientes-flujos">
        <h2 id="siguientes-flujos" className="text-xl font-bold text-presucart-tinta">
          Siguientes flujos previstos
        </h2>
        {nextFlows.map((flow) => (
          <FlowLink key={flow.title} title={flow.title} description={flow.description} />
        ))}
      </section>
    </main>
  );
}
