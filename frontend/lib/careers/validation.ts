import type { CareerApplicationInput } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateApplication(input: CareerApplicationInput, requireResume: boolean) {
  const errors: string[] = [];
  if (!input.firstName?.trim()) errors.push("First name is required");
  if (!input.lastName?.trim()) errors.push("Last name is required");
  if (!input.email?.trim() || !EMAIL_REGEX.test(input.email)) errors.push("Valid email is required");
  if (!input.locationCity?.trim()) errors.push("Location city is required");
  if (!input.locationCountry?.trim()) errors.push("Location country is required");
  if (!input.workRights?.trim()) errors.push("Work rights selection is required");
  if (!input.roleOfInterest?.trim()) errors.push("Role of interest is required");
  if (!input.consent) errors.push("Consent is required");
  if (input.honeypot && input.honeypot.trim().length > 0) errors.push("Invalid submission");
  if (requireResume) {
    const resume = input.attachments?.some((att) => att.kind === "resume");
    if (!resume) errors.push("Resume is required");
  }
  return errors;
}

