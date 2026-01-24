export type DutyCalculation = {
  readonly hsCode: string;
  readonly customsDuty: number; // absolute amount
  readonly gst: number;         // absolute amount
  readonly currency: string;    // e.g. AUD
};
