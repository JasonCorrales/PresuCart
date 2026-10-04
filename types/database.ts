export type PurchaseStatus = "activa" | "finalizada" | "cancelada";

export type Profile = {
  id: string;
  display_name: string | null;
  currency_code: "CRC";
  created_at: string;
  updated_at: string;
};

export type Store = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

export type Product = {
  id: string;
  owner_id: string;
  name: string | null;
  barcode: string | null;
  category: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  owner_id: string;
  store_id: string | null;
  store_name_snapshot: string | null;
  budget_amount: number;
  total_amount: number;
  status: PurchaseStatus;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseItem = {
  id: string;
  purchase_id: string;
  product_id: string | null;
  product_name_snapshot: string | null;
  unit_price_amount: number;
  quantity: number;
  subtotal_amount: number;
  added_at: string;
  created_at: string;
  updated_at: string;
};
