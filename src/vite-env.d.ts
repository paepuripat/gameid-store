/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROMPTPAY_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
