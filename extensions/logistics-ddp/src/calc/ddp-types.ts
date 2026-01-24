export type DDPCurrency = "AUD" | "USD" | "CNY";

export type DDPInput = {
  readonly shipmentId: string;
  readonly hsCode: string;
  readonly originCountry: string;
  readonly destinationCountry: string;
  readonly declaredValue: number;
  readonly currency: DDPCurrency;
  readonly weightKg: number;
};

export type DDPResult = {
  readonly shipmentId: string;
  readonly duty: number;
  readonly gst: number;
  readonly total: number;
  readonly currency: DDPCurrency;
};
