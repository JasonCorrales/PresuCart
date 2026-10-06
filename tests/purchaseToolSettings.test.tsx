import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PurchaseToolSettings } from "@/components/PurchaseToolSettings";

afterEach(cleanup);

describe("PurchaseToolSettings", () => {
  it("starts closed with both optional tools disabled and does not submit the parent form", () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    const onChange = vi.fn();

    render(
      <form onSubmit={onSubmit}>
        <PurchaseToolSettings
          enablePriceScanner={false}
          enableProductIdentity={false}
          onEnablePriceScannerChange={(enabled) => onChange("price", enabled)}
          onEnableProductIdentityChange={(enabled) => onChange("product", enabled)}
        />
      </form>,
    );

    const toggle = screen.getByRole("button", { name: "Configurar herramientas opcionales" });
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "purchase-tool-settings-panel");
    expect(screen.queryByRole("checkbox", { name: /Mostrar escáner local de precio/ })).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("checkbox", { name: /Mostrar escáner local de precio/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Mostrar identificación de producto/ })).not.toBeChecked();
  });

  it("reports independent enable and hide choices from labelled checkboxes", () => {
    const onPriceChange = vi.fn();
    const onProductChange = vi.fn();

    const { rerender } = render(
      <PurchaseToolSettings
        enablePriceScanner={false}
        enableProductIdentity={false}
        onEnablePriceScannerChange={onPriceChange}
        onEnableProductIdentityChange={onProductChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Configurar herramientas opcionales" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar escáner local de precio/ }));
    expect(onPriceChange).toHaveBeenCalledWith(true);
    expect(onProductChange).not.toHaveBeenCalled();

    rerender(
      <PurchaseToolSettings
        enablePriceScanner={true}
        enableProductIdentity={false}
        onEnablePriceScannerChange={onPriceChange}
        onEnableProductIdentityChange={onProductChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar identificación de producto/ }));
    expect(onProductChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar escáner local de precio/ }));
    expect(onPriceChange).toHaveBeenLastCalledWith(false);
  });

  it("shows enabled content immediately, unmounts it when hidden, and preserves draft values", () => {
    const scannerUnmount = vi.fn();

    function ScannerProbe() {
      React.useEffect(() => scannerUnmount, []);
      return <p>Escáner montado</p>;
    }

    function Harness() {
      const [enablePriceScanner, setEnablePriceScanner] = React.useState(false);
      const [enableProductIdentity, setEnableProductIdentity] = React.useState(false);
      const [productName, setProductName] = React.useState("");

      return (
        <>
          <PurchaseToolSettings
            enablePriceScanner={enablePriceScanner}
            enableProductIdentity={enableProductIdentity}
            onEnablePriceScannerChange={setEnablePriceScanner}
            onEnableProductIdentityChange={setEnableProductIdentity}
          />
          {enablePriceScanner ? <ScannerProbe /> : null}
          {enableProductIdentity ? (
            <label>
              Nombre del producto
              <input value={productName} onChange={(event) => setProductName(event.target.value)} />
            </label>
          ) : null}
        </>
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Configurar herramientas opcionales" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar escáner local de precio/ }));
    expect(screen.getByText("Escáner montado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar identificación de producto/ }));
    fireEvent.change(screen.getByLabelText("Nombre del producto"), { target: { value: "Leche" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar identificación de producto/ }));
    expect(screen.queryByLabelText("Nombre del producto")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar identificación de producto/ }));
    expect(screen.getByLabelText("Nombre del producto")).toHaveValue("Leche");

    fireEvent.click(screen.getByRole("checkbox", { name: /Mostrar escáner local de precio/ }));
    expect(screen.queryByText("Escáner montado")).not.toBeInTheDocument();
    expect(scannerUnmount).toHaveBeenCalledTimes(1);
  });
});
