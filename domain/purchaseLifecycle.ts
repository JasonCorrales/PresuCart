export type PurchaseLifecycleIdentity = {
  userId: string;
  purchaseId: string;
};

export function getPurchaseLifecycleIdentity(userId: string, purchaseId: string): PurchaseLifecycleIdentity {
  return { userId, purchaseId };
}

export function isSamePurchaseLifecycleIdentity(left: PurchaseLifecycleIdentity | null, right: PurchaseLifecycleIdentity | null): boolean {
  return Boolean(left && right && left.userId === right.userId && left.purchaseId === right.purchaseId);
}
