"use client";

import { useState } from "react";

type PurchaseToolSettingsProps = {
  enablePriceScanner: boolean;
  enableProductIdentity: boolean;
  onEnablePriceScannerChange: (enabled: boolean) => void;
  onEnableProductIdentityChange: (enabled: boolean) => void;
};

const SETTINGS_PANEL_ID = "purchase-tool-settings-panel";

export function PurchaseToolSettings({
  enablePriceScanner,
  enableProductIdentity,
  onEnablePriceScannerChange,
  onEnableProductIdentityChange,
}: PurchaseToolSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={SETTINGS_PANEL_ID}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left font-black text-presucart-tinta shadow-sm"
      >
        <span>Configurar herramientas opcionales</span>
        <span aria-hidden="true" className="text-2xl leading-none">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen ? (
        <div id={SETTINGS_PANEL_ID} className="mt-4 space-y-3">
          <label className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-presucart-tinta">
            <input
              type="checkbox"
              checked={enablePriceScanner}
              onChange={(event) => onEnablePriceScannerChange(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600"
            />
            <span>
              Mostrar escáner local de precio
              <span className="block text-xs font-semibold leading-5 text-slate-600">Lo podés ocultar para apagar la cámara.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-presucart-tinta">
            <input
              type="checkbox"
              checked={enableProductIdentity}
              onChange={(event) => onEnableProductIdentityChange(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600"
            />
            <span>
              Mostrar identificación de producto
              <span className="block text-xs font-semibold leading-5 text-slate-600">Nombre o código opcional para reconocerlo después.</span>
            </span>
          </label>
        </div>
      ) : null}
    </section>
  );
}
