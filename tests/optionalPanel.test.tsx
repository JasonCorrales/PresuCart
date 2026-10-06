import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptionalPanel } from "@/components/OptionalPanel";

afterEach(cleanup);

describe("OptionalPanel", () => {
  it("is collapsed by default and toggles accessible content without submitting its parent form", () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <OptionalPanel title="Identificar producto (opcional)" id="product-panel">
          <label htmlFor="product-name">Nombre del producto</label>
          <input id="product-name" />
        </OptionalPanel>
      </form>,
    );

    const toggle = screen.getByRole("button", { name: "Identificar producto (opcional)" });
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "product-panel");
    expect(screen.queryByLabelText("Nombre del producto")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Nombre del producto")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Nombre del producto")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens panels independently and unmounts only the collapsed panel", () => {
    const firstUnmount = vi.fn();
    const secondUnmount = vi.fn();

    function Probe({ label, onUnmount }: { label: string; onUnmount: () => void }) {
      React.useEffect(() => onUnmount, [onUnmount]);
      return <p>{label}</p>;
    }

    render(
      <>
        <OptionalPanel title="Escáner local de precio" id="price-scanner-panel">
          <Probe label="price scanner mounted" onUnmount={firstUnmount} />
        </OptionalPanel>
        <OptionalPanel title="Identificar producto (opcional)" id="product-panel">
          <Probe label="product scanner mounted" onUnmount={secondUnmount} />
        </OptionalPanel>
      </>,
    );

    const priceToggle = screen.getByRole("button", { name: "Escáner local de precio" });
    const productToggle = screen.getByRole("button", { name: "Identificar producto (opcional)" });

    expect(screen.queryByText("price scanner mounted")).not.toBeInTheDocument();
    expect(screen.queryByText("product scanner mounted")).not.toBeInTheDocument();

    fireEvent.click(priceToggle);
    expect(screen.getByText("price scanner mounted")).toBeInTheDocument();
    expect(screen.queryByText("product scanner mounted")).not.toBeInTheDocument();

    fireEvent.click(productToggle);
    expect(screen.getByText("price scanner mounted")).toBeInTheDocument();
    expect(screen.getByText("product scanner mounted")).toBeInTheDocument();

    fireEvent.click(priceToggle);
    expect(screen.queryByText("price scanner mounted")).not.toBeInTheDocument();
    expect(screen.getByText("product scanner mounted")).toBeInTheDocument();
    expect(firstUnmount).toHaveBeenCalledTimes(1);
    expect(secondUnmount).not.toHaveBeenCalled();
  });
});
