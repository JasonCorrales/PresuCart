"use client";

import { ReactNode, useState } from "react";

type OptionalPanelProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function OptionalPanel({ id, title, description, children }: OptionalPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left font-black text-presucart-tinta shadow-sm"
      >
        <span>{title}</span>
        <span aria-hidden="true" className="text-2xl leading-none">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p> : null}
      {isOpen ? (
        <div id={id} className="mt-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
