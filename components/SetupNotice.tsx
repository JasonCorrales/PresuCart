export function SetupNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="status">
      <p className="font-bold">Configura Supabase para continuar</p>
      <p className="mt-1">
        Faltan <code>NEXT_PUBLIC_SUPABASE_URL</code> y/o <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Agrégalas en
        <code> .env.local</code> y reinicia la app. La compilación funciona sin claves reales.
      </p>
    </div>
  );
}
