export interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  active: number;
  stockCount: number;
}

export interface CreatedOrder {
  orderId: string;
  amount: number;
  productId: string;
}

export interface RevealedCredential {
  username: string;
  password: string;
  notes: string | null;
}

export type VerifyResult =
  | { ok: true; credential: RevealedCredential; emailDelivered: boolean }
  | {
      ok: false;
      reason:
        | "invalid_slip"
        | "wrong_amount"
        | "wrong_receiver"
        | "duplicate_slip"
        | "sold_out";
      message: string;
    };
