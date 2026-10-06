export type ActivePurchaseDraft = {
  unitPriceInput: string;
  quantityInput: string;
  productNameInput: string;
  barcodeInput: string;
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

const DEFAULT_QUANTITY = "1";
const DRAFT_NAMESPACE = "presucart:active-purchase-draft";

export function buildActivePurchaseDraftKey(userId: string, purchaseId: string) {
  return `${DRAFT_NAMESPACE}:${encodeURIComponent(userId)}:${encodeURIComponent(purchaseId)}`;
}

export function normalizeActivePurchaseDraft(input: Partial<ActivePurchaseDraft>): ActivePurchaseDraft {
  const quantityInput = input.quantityInput?.trim() || DEFAULT_QUANTITY;

  return {
    unitPriceInput: input.unitPriceInput?.trim() ?? "",
    quantityInput,
    productNameInput: input.productNameInput?.trim() ?? "",
    barcodeInput: input.barcodeInput?.trim() ?? "",
  };
}

export function isActivePurchaseDraftEmpty(draft: ActivePurchaseDraft) {
  return !draft.unitPriceInput && draft.quantityInput === DEFAULT_QUANTITY && !draft.productNameInput && !draft.barcodeInput;
}

export function readActivePurchaseDraft(storage: DraftStorage, userId: string, purchaseId: string) {
  try {
    const draftJson = storage.getItem(buildActivePurchaseDraftKey(userId, purchaseId));
    return draftJson ? normalizeActivePurchaseDraft(JSON.parse(draftJson)) : null;
  } catch {
    return null;
  }
}

export function writeActivePurchaseDraft(storage: DraftStorage, userId: string, purchaseId: string, draft: ActivePurchaseDraft) {
  try {
    const key = buildActivePurchaseDraftKey(userId, purchaseId);
    if (isActivePurchaseDraftEmpty(draft)) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(draft));
    }
    return true;
  } catch {
    return false;
  }
}

export function removeActivePurchaseDraft(storage: DraftStorage, userId: string, purchaseId: string) {
  try {
    storage.removeItem(buildActivePurchaseDraftKey(userId, purchaseId));
    return true;
  } catch {
    return false;
  }
}

export function clearPresuCartDraftNamespace(storage: DraftStorage) {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(`${DRAFT_NAMESPACE}:`)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
