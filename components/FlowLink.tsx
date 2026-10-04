import Link from "next/link";

type FlowLinkProps = {
  title: string;
  description: string;
  href: string;
};

export function FlowLink({ title, description, href }: FlowLinkProps) {
  return (
    <Link href={href} className="block rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-300">
      <h3 className="text-lg font-semibold text-presucart-tinta">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
