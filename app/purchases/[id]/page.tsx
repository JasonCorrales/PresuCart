"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { OcrPriceScanner } from "@/components/OcrPriceScanner";
import { PurchaseToolSettings } from "@/components/PurchaseToolSettings";
import { SessionHeader } from "@/components/SessionHeader";
import { SetupNotice } from "@/components/SetupNotice";
import {
  readActivePurchaseDraft,
  removeActivePurchaseDraft,
  writeActivePurchaseDraft,
  normalizeActivePurchaseDraft,
} from "@/domain/activePurchaseDraft";
import { calculateBudgetSummary, itemSubtotal } from "@/domain/budget";
import { formatCRC, formatSignedCRC } from "@/domain/money";
import { normalizeSupabaseErrorMessage } from "@/domain/offline";
import { getProductSnapshotLabel, hasProductIdentity, normalizeOptionalProductIdentity } from "@/domain/productIdentity";
import { adjustQuantityInput, parsePositiveCRCAmount, parsePositiveQuantity } from "@/domain/purchaseInput";
import { getPurchaseLifecycleIdentity, isSamePurchaseLifecycleIdentity, type PurchaseLifecycleIdentity } from "@/domain/purchaseLifecycle";
import { calculatePurchaseStoredTotal, syncPurchaseStoredTotal, type PurchaseTotalSyncClient } from "@/domain/purchaseTotalSync";
import { createBrowserSupabaseClient } from "@/services/supabase";
import type { Product, Purchase, PurchaseItem } from "@/types/database";

type AlertCopy = {
  label: string;
  className: string;
};

type UndoAddState = {
  itemId: string;
  label: string;
};

type PendingTotalSync = {
  purchaseId: string;
  ownerId: string;
  items: PurchaseItem[];
  totalAmount: number;
  message: string;
};

type TotalSyncGuard = {
  routePurchaseId: string;
  purchaseId: string | null;
  ownerId: string | null;
  status: Purchase["status"] | null;
};

const UNDO_VISIBLE_MS = 7000;

const alertCopy: Record<string, AlertCopy> = {
  normal: { label: "Vas bien", className: "bg-emerald-50 text-emerald-900" },
  warning: { label: "Ojo: ya usaste 80%", className: "bg-amber-50 text-amber-900" },
  danger: { label: "Casi llegas al límite", className: "bg-orange-50 text-orange-900" },
  exceeded: { label: "Presupuesto agotado", className: "bg-red-50 text-red-900" },
};

export default function PurchasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [unitPriceInput, setUnitPriceInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [productNameInput, setProductNameInput] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [isSaving, setIsSaving] = useState(false);
  const [undoAdd, setUndoAdd] = useState<UndoAddState | null>(null);
  const [isUndoingItemId, setIsUndoingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editUnitPriceInput, setEditUnitPriceInput] = useState("");
  const [editQuantityInput, setEditQuantityInput] = useState("1");
  const [isUpdatingItemId, setIsUpdatingItemId] = useState<string | null>(null);
  const [isDeletingItemId, setIsDeletingItemId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [pendingTotalSync, setPendingTotalSync] = useState<PendingTotalSync | null>(null);
  const [isRetryingTotalSync, setIsRetryingTotalSync] = useState(false);
  const totalSyncGuardRef = useRef<TotalSyncGuard>({ routePurchaseId: params.id, purchaseId: null, ownerId: null, status: null });
  const [loadedPurchaseIdentity, setLoadedPurchaseIdentity] = useState<PurchaseLifecycleIdentity | null>(null);
  const [draftRestoredIdentity, setDraftRestoredIdentity] = useState<PurchaseLifecycleIdentity | null>(null);
  const [enablePriceScanner, setEnablePriceScanner] = useState(false);
  const [enableProductIdentity, setEnableProductIdentity] = useState(false);
  const activeSummaryRef = useRef<HTMLElement | null>(null);
  const [activeSummaryScrollRequest, setActiveSummaryScrollRequest] = useState(0);

  useEffect(() => {
    if (!supabase) return;

    let isCancelled = false;
    const client = supabase;
    const purchaseId = params.id;

    async function loadPurchase() {
      const { data: userData } = await client.auth.getUser();
      if (isCancelled) return;

      setIsLoading(true);
      setLoadedPurchaseIdentity(null);
      setUser(userData.user);
      if (!userData.user) {
        router.push("/auth");
        setIsLoading(false);
        return;
      }

      const identity = getPurchaseLifecycleIdentity(userData.user.id, purchaseId);
      const [{ data: purchaseData, error: purchaseError }, { data: itemData, error: itemError }] = await Promise.all([
        client.from("purchases").select("*").eq("id", purchaseId).eq("owner_id", userData.user.id).single(),
        client.from("purchase_items").select("*").eq("purchase_id", purchaseId).order("added_at", { ascending: false }),
      ]);
      if (isCancelled) return;

      if (purchaseError || itemError) {
        setMessage(normalizeSupabaseErrorMessage(purchaseError ?? itemError, navigator.onLine));
      } else {
        setPurchase(purchaseData as Purchase);
        setItems((itemData ?? []) as PurchaseItem[]);
        setLoadedPurchaseIdentity(identity);
      }
      setIsLoading(false);
    }

    loadPurchase();

    return () => {
      isCancelled = true;
    };
  }, [params.id, router, supabase]);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    let isCancelled = false;
    const userId = user.id;
    const purchaseId = params.id;
    const identity = getPurchaseLifecycleIdentity(userId, purchaseId);

    async function restoreActiveDraft() {
      let storage: Storage;
      try {
        storage = window.localStorage;
      } catch {
        if (!isCancelled) setDraftRestoredIdentity(identity);
        return;
      }

      const draft = readActivePurchaseDraft(storage, userId, purchaseId);
      if (isCancelled) return;

      if (draft) {
        setUnitPriceInput(draft.unitPriceInput);
        setQuantityInput(draft.quantityInput);
        setProductNameInput(draft.productNameInput);
        setBarcodeInput(draft.barcodeInput);
        if (draft.unitPriceInput || draft.quantityInput !== "1" || draft.productNameInput || draft.barcodeInput) {
          setMessage("Recuperamos lo que habías escrito antes de la interrupción. Revisa y guarda cuando tengas conexión.");
        }
      }
      setDraftRestoredIdentity(identity);
    }

    restoreActiveDraft();

    return () => {
      isCancelled = true;
    };
  }, [params.id, user]);

  useEffect(() => {
    if (purchase?.status !== "activa" || !user || typeof window === "undefined") return;

    const currentIdentity = getPurchaseLifecycleIdentity(user.id, params.id);
    if (purchase.id !== params.id) return;
    if (!isSamePurchaseLifecycleIdentity(loadedPurchaseIdentity, currentIdentity)) return;
    if (!isSamePurchaseLifecycleIdentity(draftRestoredIdentity, currentIdentity)) return;

    try {
      const draft = normalizeActivePurchaseDraft({ unitPriceInput, quantityInput, productNameInput, barcodeInput });
      writeActivePurchaseDraft(window.localStorage, user.id, purchase.id, draft);
    } catch {
      // Blocked localStorage should not break active shopping.
    }
  }, [barcodeInput, draftRestoredIdentity, loadedPurchaseIdentity, params.id, productNameInput, purchase, quantityInput, unitPriceInput, user]);

  useEffect(() => {
    totalSyncGuardRef.current = {
      routePurchaseId: params.id,
      purchaseId: purchase?.id ?? null,
      ownerId: user?.id ?? null,
      status: purchase?.status ?? null,
    };
  }, [params.id, purchase, user]);

  useEffect(() => {
    if (!undoAdd) return;

    const timeoutId = window.setTimeout(() => setUndoAdd(null), UNDO_VISIBLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [undoAdd]);

  useEffect(() => {
    if (!activeSummaryScrollRequest) return;

    const summaryElement = activeSummaryRef.current;
    if (!summaryElement || typeof summaryElement.scrollIntoView !== "function") return;

    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    summaryElement.scrollIntoView({ block: "start", behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [activeSummaryScrollRequest]);

  const summary = useMemo(() => {
    if (!purchase) return null;
    return calculateBudgetSummary(
      purchase.budget_amount,
      items.map((item) => ({ unitPrice: item.unit_price_amount, quantity: item.quantity })),
    );
  }, [items, purchase]);

  function isCurrentTotalSyncTarget(target: Pick<PendingTotalSync, "purchaseId" | "ownerId">) {
    const guard = totalSyncGuardRef.current;
    return guard.routePurchaseId === target.purchaseId && guard.purchaseId === target.purchaseId && guard.ownerId === target.ownerId && guard.status === "activa";
  }

  function isAnyPurchaseActionBusy() {
    return Boolean(isSaving || isFinalizing || isRetryingTotalSync || isUndoingItemId || isUpdatingItemId || isDeletingItemId);
  }

  function totalSyncWarningCopy(issue: PendingTotalSync) {
    return `El ítem sí quedó guardado, pero no pudimos actualizar el total guardado (${issue.message}). Tu pantalla usa los ítems actuales; el historial puede mostrar un total anterior hasta reintentar.`;
  }

  async function syncStoredTotal(nextItems: PurchaseItem[]) {
    if (!supabase || !purchase || !user || purchase.status !== "activa" || purchase.id !== params.id) return;

    const pending: PendingTotalSync = {
      purchaseId: purchase.id,
      ownerId: user.id,
      items: nextItems.map((item) => ({ ...item })),
      totalAmount: calculatePurchaseStoredTotal(nextItems),
      message: "No pudimos guardar el total de la compra.",
    };

    const totalSyncClient = supabase as unknown as PurchaseTotalSyncClient;
    const result = await syncPurchaseStoredTotal(totalSyncClient, pending);
    if (!isCurrentTotalSyncTarget(pending)) return;

    if (result.ok) {
      setPendingTotalSync(null);
      return;
    }

    setPendingTotalSync({ ...pending, totalAmount: result.totalAmount, message: result.message });
  }

  async function retryStoredTotalSync() {
    if (!supabase || !pendingTotalSync || isAnyPurchaseActionBusy() || !isCurrentTotalSyncTarget(pendingTotalSync)) return;

    const pending = pendingTotalSync;
    setIsRetryingTotalSync(true);
    const totalSyncClient = supabase as unknown as PurchaseTotalSyncClient;
    const result = await syncPurchaseStoredTotal(totalSyncClient, pending);
    if (!isCurrentTotalSyncTarget(pending)) return;
    setIsRetryingTotalSync(false);

    if (result.ok) {
      setPendingTotalSync(null);
      return;
    }

    setPendingTotalSync({ ...pending, totalAmount: result.totalAmount, message: result.message });
  }

  function setQuickQuantity(delta: number) {
    if (purchase?.status !== "activa") return;
    setQuantityInput((current) => adjustQuantityInput(current, delta));
  }

  function resetQuickQuantity() {
    if (purchase?.status !== "activa") return;
    setQuantityInput("1");
  }

  function clearActiveDraft(purchaseId: string) {
    if (typeof window === "undefined" || !user) return;
    try {
      removeActivePurchaseDraft(window.localStorage, user.id, purchaseId);
    } catch {
      // Blocked localStorage should not break persisted Supabase actions.
    }
  }

  function handleOcrCandidate(amount: number) {
    if (purchase?.status !== "activa") return;
    setUnitPriceInput(String(amount));
    setMessage("Precio detectado listo. Revisa la cantidad y presiona agregar al carrito.");
  }

  function handleBarcodeDetected(barcode: string) {
    if (purchase?.status !== "activa") return;
    setBarcodeInput(barcode);
    setMessage("Código detectado listo. Solo identifica el producto; revisa el precio y la cantidad antes de agregar.");
  }

  async function resolveProductForItem(identity: ReturnType<typeof normalizeOptionalProductIdentity>) {
    if (!supabase || !user || !hasProductIdentity(identity)) {
      return { product_id: null, product_name_snapshot: null };
    }

    if (identity.barcode) {
      const { data: existingProduct, error: lookupError } = await supabase
        .from("products")
        .select("*")
        .eq("owner_id", user.id)
        .eq("barcode", identity.barcode)
        .maybeSingle();

      if (lookupError) throw new Error(lookupError.message);

      if (existingProduct) {
        const product = existingProduct as Product;
        const snapshotLabel = getProductSnapshotLabel({
          name: identity.name ?? product.name,
          barcode: product.barcode ?? identity.barcode,
        });
        return { product_id: product.id, product_name_snapshot: snapshotLabel };
      }
    }

    const { data: createdProduct, error: createError } = await supabase
      .from("products")
      .insert({ owner_id: user.id, name: identity.name, barcode: identity.barcode })
      .select("*")
      .single();

    if (createError) {
      if (identity.barcode && createError.code === "23505") {
        const { data: concurrentProduct, error: retryError } = await supabase
          .from("products")
          .select("*")
          .eq("owner_id", user.id)
          .eq("barcode", identity.barcode)
          .maybeSingle();

        if (retryError) throw new Error(retryError.message);
        if (concurrentProduct) {
          const product = concurrentProduct as Product;
          const snapshotLabel = getProductSnapshotLabel({
            name: identity.name ?? product.name,
            barcode: product.barcode ?? identity.barcode,
          });
          return { product_id: product.id, product_name_snapshot: snapshotLabel };
        }
      }

      throw new Error(createError.message);
    }

    const product = createdProduct as Product;
    return {
      product_id: product.id,
      product_name_snapshot: getProductSnapshotLabel({ name: product.name, barcode: product.barcode }),
    };
  }

  function setEditQuickQuantity(delta: number) {
    if (purchase?.status !== "activa") return;
    setEditQuantityInput((current) => adjustQuantityInput(current, delta));
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !purchase || purchase.status !== "activa") return;

    const parsedPrice = parsePositiveCRCAmount(unitPriceInput, "El precio");
    if (!parsedPrice.ok) {
      setMessage(parsedPrice.message);
      return;
    }

    const parsedQuantity = parsePositiveQuantity(quantityInput);
    if (!parsedQuantity.ok) {
      setMessage(parsedQuantity.message);
      return;
    }

    const productIdentity = normalizeOptionalProductIdentity(productNameInput, barcodeInput);

    setIsSaving(true);
    setMessage(null);
    let productFields: { product_id: string | null; product_name_snapshot: string | null };
    try {
      productFields = await resolveProductForItem(productIdentity);
    } catch (error) {
      setIsSaving(false);
      setMessage(normalizeSupabaseErrorMessage(error, navigator.onLine));
      return;
    }

    const { data, error } = await supabase
      .from("purchase_items")
      .insert({
        purchase_id: purchase.id,
        product_id: productFields.product_id,
        product_name_snapshot: productFields.product_name_snapshot,
        unit_price_amount: parsedPrice.amount,
        quantity: parsedQuantity.quantity,
      })
      .select("*")
      .single();
    setIsSaving(false);

    if (error) {
      setMessage(normalizeSupabaseErrorMessage(error, navigator.onLine));
      return;
    }

    const createdItem = data as PurchaseItem;
    const nextItems = [createdItem, ...items];
    setItems(nextItems);
    setUndoAdd({
      itemId: createdItem.id,
      label: createdItem.product_name_snapshot
        ? `${createdItem.product_name_snapshot}: ${formatCRC(createdItem.unit_price_amount)} × ${createdItem.quantity}`
        : `${formatCRC(createdItem.unit_price_amount)} × ${createdItem.quantity}`,
    });
    setUnitPriceInput("");
    setQuantityInput("1");
    setProductNameInput("");
    setBarcodeInput("");
    clearActiveDraft(purchase.id);
    setActiveSummaryScrollRequest((request) => request + 1);
    await syncStoredTotal(nextItems);
  }

  async function deletePersistedItem(itemId: string, nextItems: PurchaseItem[]) {
    if (!supabase || !purchase) return false;
    const { error } = await supabase.from("purchase_items").delete().eq("id", itemId).eq("purchase_id", purchase.id);
    if (error) {
      setMessage(normalizeSupabaseErrorMessage(error, navigator.onLine));
      return false;
    }
    await syncStoredTotal(nextItems);
    return true;
  }

  async function handleUndoAdd() {
    if (!undoAdd || isUndoingItemId || purchase?.status !== "activa") return;
    const itemId = undoAdd.itemId;
    const itemStillExists = items.some((item) => item.id === itemId);
    if (!itemStillExists) {
      setUndoAdd(null);
      return;
    }

    const nextItems = items.filter((item) => item.id !== itemId);
    setIsUndoingItemId(itemId);
    setMessage(null);
    const deleted = await deletePersistedItem(itemId, nextItems);
    setIsUndoingItemId(null);
    if (!deleted) return;

    setItems(nextItems);
    setUndoAdd(null);
  }

  async function handleDeleteItem(itemId: string) {
    if (purchase?.status !== "activa" || isDeletingItemId) return;
    const nextItems = items.filter((item) => item.id !== itemId);
    setIsDeletingItemId(itemId);
    setMessage(null);
    const deleted = await deletePersistedItem(itemId, nextItems);
    setIsDeletingItemId(null);
    if (!deleted) return;

    setItems(nextItems);
    if (undoAdd?.itemId === itemId) setUndoAdd(null);
    if (editingItemId === itemId) cancelEditing();
  }

  function startEditing(item: PurchaseItem) {
    if (purchase?.status !== "activa") return;
    setEditingItemId(item.id);
    setEditUnitPriceInput(String(item.unit_price_amount));
    setEditQuantityInput(String(item.quantity));
    setMessage(null);
  }

  function cancelEditing() {
    setEditingItemId(null);
    setEditUnitPriceInput("");
    setEditQuantityInput("1");
  }

  async function handleSaveEdit(itemId: string) {
    if (!supabase || !purchase || purchase.status !== "activa") return;

    const parsedPrice = parsePositiveCRCAmount(editUnitPriceInput, "El precio");
    if (!parsedPrice.ok) {
      setMessage(parsedPrice.message);
      return;
    }

    const parsedQuantity = parsePositiveQuantity(editQuantityInput);
    if (!parsedQuantity.ok) {
      setMessage(parsedQuantity.message);
      return;
    }

    setIsUpdatingItemId(itemId);
    setMessage(null);
    const { data, error } = await supabase
      .from("purchase_items")
      .update({ unit_price_amount: parsedPrice.amount, quantity: parsedQuantity.quantity })
      .eq("id", itemId)
      .eq("purchase_id", purchase.id)
      .select("*")
      .single();
    setIsUpdatingItemId(null);

    if (error) {
      setMessage(normalizeSupabaseErrorMessage(error, navigator.onLine));
      return;
    }

    const updatedItem = data as PurchaseItem;
    const nextItems = items.map((item) => (item.id === itemId ? updatedItem : item));
    setItems(nextItems);
    if (undoAdd?.itemId === itemId) setUndoAdd(null);
    cancelEditing();
    await syncStoredTotal(nextItems);
  }

  async function handleFinalizePurchase() {
    if (!supabase || !purchase || !summary || purchase.status !== "activa") return;

    setIsFinalizing(true);
    setMessage(null);
    const finishedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("purchases")
      .update({ status: "finalizada", finished_at: finishedAt, total_amount: summary.spent })
      .eq("id", purchase.id)
      .eq("owner_id", purchase.owner_id)
      .select("*")
      .single();
    setIsFinalizing(false);

    if (error) {
      setMessage(normalizeSupabaseErrorMessage(error, navigator.onLine));
      return;
    }

    clearActiveDraft(purchase.id);
    setPurchase(data as Purchase);
    setUndoAdd(null);
    cancelEditing();
    setMessage("Compra finalizada. Queda guardada solo lectura en el historial.");
  }

  const progressWidth = summary ? `${Math.min(summary.usedPercent, 100)}%` : "0%";
  const progressFillClass = summary ? getProgressFillClass(summary.usedPercent) : getProgressFillClass(0);
  const currentAlert = summary ? alertCopy[summary.alertState] : alertCopy.normal;
  const isActive = purchase?.status === "activa";
  const isFinalized = purchase?.status === "finalizada";
  const visiblePendingTotalSync =
    pendingTotalSync && pendingTotalSync.purchaseId === params.id && pendingTotalSync.purchaseId === purchase?.id && pendingTotalSync.ownerId === user?.id && isActive
      ? pendingTotalSync
      : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden px-3 py-3 sm:px-5 sm:py-6">
      <SessionHeader user={user} />
      {!supabase ? (
        <SetupNotice />
      ) : isLoading ? (
        <p className="rounded-2xl bg-white p-5 font-semibold text-slate-700 shadow">Cargando compra...</p>
      ) : !purchase || !summary ? (
        <section className="rounded-[2rem] bg-white p-5 shadow-xl">
          <h1 className="text-2xl font-black text-presucart-tinta">No encontramos esta compra</h1>
          <p className="mt-3 text-slate-600">Verifica que hayas iniciado sesión con el usuario correcto.</p>
          {message ? <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
        </section>
      ) : (
        <div className="space-y-3 sm:space-y-5">
          <section ref={activeSummaryRef} className="rounded-[1.5rem] bg-presucart-tinta p-3 text-white shadow-xl sm:rounded-[2rem] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200 sm:text-sm sm:tracking-[0.2em]">Compra {purchase.status}</p>
                <h1 className="mt-1 break-words text-2xl font-black leading-tight sm:mt-2 sm:text-3xl">{purchase.store_name_snapshot ?? "Supermercado sin nombre"}</h1>
              </div>
              {isActive ? (
                <button
                  type="button"
                  onClick={handleFinalizePurchase}
                  disabled={isFinalizing}
                  className="min-h-11 shrink-0 rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-black leading-tight text-white disabled:bg-slate-300 sm:min-h-14 sm:px-5 sm:py-4 sm:text-lg"
                >
                  {isFinalizing ? "Finalizando..." : "Finalizar compra"}
                </button>
              ) : null}
            </div>
            <div className="mt-3 rounded-[1.25rem] bg-white p-3 text-presucart-tinta sm:mt-5 sm:rounded-[1.5rem] sm:p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 sm:tracking-[0.25em]">Disponible</p>
              <p className="mt-1 break-words text-3xl font-black leading-none sm:text-4xl">{formatSignedCRC(summary.available)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
              <Metric label="Presupuesto" value={formatCRC(summary.budget)} />
              <Metric label="Gastado" value={formatCRC(summary.spent)} />
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20 sm:mt-5 sm:h-4">
              <div className={`h-full rounded-full ${progressFillClass}`} style={{ width: progressWidth }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
              <p className={`min-h-11 flex-1 rounded-2xl px-3 py-3 text-sm font-black ${currentAlert.className}`}>{currentAlert.label}</p>
              <p className="min-h-11 rounded-2xl bg-white/10 px-3 py-3 text-sm font-black text-emerald-50">{Math.round(summary.usedPercent)}% usado</p>
            </div>
            {!isActive ? (
              <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-emerald-50 sm:mt-4">
                {isFinalized
                  ? "Esta compra ya fue finalizada y queda solo lectura. No puedes agregar, editar, borrar ni deshacer ítems."
                  : "Esta compra no está activa y queda solo lectura."}
              </p>
            ) : null}
          </section>

          {message ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
          {visiblePendingTotalSync ? (
            <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
              <p>{totalSyncWarningCopy(visiblePendingTotalSync)}</p>
              <button
                type="button"
                onClick={retryStoredTotalSync}
                disabled={isAnyPurchaseActionBusy() || !isActive}
                className="mt-3 min-h-12 w-full rounded-xl bg-amber-600 px-4 py-3 text-base font-black text-white disabled:bg-slate-300"
              >
                {isRetryingTotalSync ? "Reintentando..." : "Reintentar guardar total"}
              </button>
            </section>
          ) : null}

          {isActive ? (
            <section className="rounded-[1.5rem] bg-white p-3 shadow-xl sm:rounded-[2rem] sm:p-5" aria-labelledby="quick-add-heading">
              <h2 id="quick-add-heading" className="sr-only">Formulario rápido de compra</h2>
              <div>
                <PurchaseToolSettings
                  enablePriceScanner={enablePriceScanner}
                  enableProductIdentity={enableProductIdentity}
                  onEnablePriceScannerChange={setEnablePriceScanner}
                  onEnableProductIdentityChange={setEnableProductIdentity}
                />
              </div>
              <form className="mt-3 space-y-3 sm:mt-5 sm:space-y-4" onSubmit={handleAddItem}>
                <label className="block font-bold text-presucart-tinta">
                  Precio unitario CRC
                  <input
                    inputMode="numeric"
                    value={unitPriceInput}
                    onChange={(event) => setUnitPriceInput(event.target.value)}
                    required
                    className="mt-1 min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-xl font-black sm:mt-2 sm:min-h-16 sm:text-2xl"
                    placeholder="₡2.500"
                  />
                </label>
                <QuantityField
                  value={quantityInput}
                  onChange={setQuantityInput}
                  onDecrement={() => setQuickQuantity(-1)}
                  onIncrement={() => setQuickQuantity(1)}
                  onReset={resetQuickQuantity}
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-12 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-lg font-black text-white disabled:bg-slate-300 sm:min-h-14 sm:py-4"
                >
                  {isSaving ? "Agregando..." : "Agregar al carrito"}
                </button>
                {undoAdd ? (
                  <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4">
                    <p className="text-sm font-bold text-emerald-900">Agregado: {undoAdd.label}</p>
                    <button
                      type="button"
                      onClick={handleUndoAdd}
                      disabled={isUndoingItemId === undoAdd.itemId}
                      className="mt-3 min-h-12 w-full rounded-xl bg-presucart-tinta px-4 py-3 text-lg font-black text-white disabled:bg-slate-300"
                    >
                      {isUndoingItemId === undoAdd.itemId ? "Deshaciendo..." : "DESHACER"}
                    </button>
                  </div>
                ) : null}
                <div className="mt-5 space-y-4">
                  {enablePriceScanner ? (
                    <section id="price-scanner-panel" className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-black text-presucart-tinta">Escáner local de precio</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Captura una etiqueta solo cuando lo necesites; al ocultarlo se desmonta el escáner y se apaga la cámara.</p>
                      <div className="mt-4">
                        <OcrPriceScanner onSelectCandidate={handleOcrCandidate} />
                      </div>
                    </section>
                  ) : null}
                  {enableProductIdentity ? (
                    <section id="product-identity-panel" className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                      <fieldset>
                        <legend className="font-black text-presucart-tinta">Identificar producto (opcional)</legend>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Si tenés tiempo, agregá nombre o código para reconocerlo después. El código no cambia el precio.</p>
                        <div className="mt-4 space-y-3">
                          <label className="block text-sm font-bold text-presucart-tinta">
                            Nombre del producto
                            <input
                              value={productNameInput}
                              onChange={(event) => setProductNameInput(event.target.value)}
                              className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-base font-bold"
                              placeholder="Ej. Leche 1L"
                            />
                          </label>
                          <label className="block text-sm font-bold text-presucart-tinta">
                            Código de barras o código manual
                            <input
                              inputMode="text"
                              value={barcodeInput}
                              onChange={(event) => setBarcodeInput(event.target.value)}
                              className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-base font-bold"
                              placeholder="Escaneado o escrito"
                            />
                          </label>
                          <BarcodeScanner onDetect={handleBarcodeDetected} />
                        </div>
                      </fieldset>
                    </section>
                  ) : null}
                </div>
              </form>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-xl font-black text-presucart-tinta">Ítems agregados</h2>
            {items.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-slate-600 shadow-sm">Aún no has agregado precios.</p>
            ) : (
              items.map((item) => {
                const isEditing = editingItemId === item.id;
                return (
                  <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    {isEditing ? (
                      <div className="space-y-4">
                        <label className="block font-bold text-presucart-tinta">
                          Precio unitario CRC
                          <input
                            inputMode="numeric"
                            value={editUnitPriceInput}
                            onChange={(event) => setEditUnitPriceInput(event.target.value)}
                            className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-xl font-black"
                          />
                        </label>
                        <QuantityField
                          value={editQuantityInput}
                          onChange={setEditQuantityInput}
                          onDecrement={() => setEditQuickQuantity(-1)}
                          onIncrement={() => setEditQuickQuantity(1)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={isUpdatingItemId === item.id}
                            className="min-h-12 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:bg-slate-300"
                          >
                            {isUpdatingItemId === item.id ? "Guardando..." : "Guardar"}
                          </button>
                          <button type="button" onClick={cancelEditing} className="min-h-12 rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {item.product_name_snapshot ? <p className="break-words text-sm font-bold text-slate-600">{item.product_name_snapshot}</p> : null}
                          <p className="break-words font-black text-presucart-tinta">
                            {formatCRC(item.unit_price_amount)} × {item.quantity}
                          </p>
                          <p className="break-words text-sm text-slate-600">Subtotal {formatCRC(itemSubtotal({ unitPrice: item.unit_price_amount, quantity: item.quantity }))}</p>
                        </div>
                        {isActive ? (
                          <div className="flex shrink-0 flex-col gap-2">
                            <button type="button" onClick={() => startEditing(item)} className="min-h-11 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-presucart-tinta">
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={isDeletingItemId === item.id}
                              className="min-h-11 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {isDeletingItemId === item.id ? "Borrando..." : "Borrar"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function getProgressFillClass(usedPercent: number) {
  if (usedPercent >= 90) return "bg-red-500";
  if (usedPercent >= 70) return "bg-yellow-300";
  return "bg-emerald-300";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 p-2 sm:p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">{label}</p>
      <p className="mt-1 break-words text-base font-black leading-tight sm:text-lg">{value}</p>
    </div>
  );
}

function QuantityField({
  value,
  onChange,
  onDecrement,
  onIncrement,
  onReset,
}: {
  value: string;
  onChange: (value: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="font-bold text-presucart-tinta">
      <div className="flex items-center justify-between">
        <span>Cantidad</span>
        {onReset ? (
          <button type="button" onClick={onReset} className="min-h-11 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
            Reiniciar a 1
          </button>
        ) : null}
      </div>
      <div className="mt-1 grid grid-cols-[3.5rem_1fr_3.5rem] gap-2 sm:mt-2 sm:grid-cols-[4rem_1fr_4rem]">
        <button type="button" onClick={onDecrement} className="min-h-12 rounded-2xl bg-slate-100 text-3xl font-black text-presucart-tinta sm:min-h-14" aria-label="Bajar cantidad">
          −
        </button>
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-center text-2xl font-black sm:min-h-14"
        />
        <button type="button" onClick={onIncrement} className="min-h-12 rounded-2xl bg-slate-100 text-3xl font-black text-presucart-tinta sm:min-h-14" aria-label="Subir cantidad">
          +
        </button>
      </div>
    </div>
  );
}
