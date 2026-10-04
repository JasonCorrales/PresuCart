type FlowLinkProps = {
  title: string;
  description: string;
};

export function FlowLink({ title, description }: FlowLinkProps) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-presucart-tinta">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
