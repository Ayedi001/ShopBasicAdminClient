/**
 * Phone helpers. Defaults target Tunisia (+216, 8 national digits) but the
 * country code / length are configurable through store settings.
 */
export type PhoneConfig = { countryCode: string; nationalDigits: number };
export const DEFAULT_PHONE_CONFIG: PhoneConfig = { countryCode: "216", nationalDigits: 8 };

/** Returns the E.164 form (e.g. +21698123456) or null when invalid. */
export function normalizePhone(input: string, cfg: PhoneConfig = DEFAULT_PHONE_CONFIG): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === cfg.nationalDigits) {
    digits = cfg.countryCode + digits;
  }
  if (!digits.startsWith(cfg.countryCode)) return null;
  const national = digits.slice(cfg.countryCode.length);
  if (national.length !== cfg.nationalDigits || !/^\d+$/.test(national)) return null;
  // Tunisian mobile/landline numbers start with 2,3,4,5,7,9
  if (cfg.countryCode === "216" && !/^[2-9]/.test(national)) return null;
  return `+${digits}`;
}

export function isValidPhone(input: string, cfg: PhoneConfig = DEFAULT_PHONE_CONFIG): boolean {
  return normalizePhone(input, cfg) !== null;
}

/** "+21698123456" -> "+216 98 123 456" */
export function formatPhone(e164: string | null | undefined, cfg: PhoneConfig = DEFAULT_PHONE_CONFIG): string {
  if (!e164) return "";
  const digits = e164.replace(/\D/g, "");
  if (!digits.startsWith(cfg.countryCode)) return e164;
  const national = digits.slice(cfg.countryCode.length);
  if (cfg.countryCode === "216" && national.length === 8) {
    return `+216 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }
  return `+${cfg.countryCode} ${national}`;
}

/** Digits only, suitable for wa.me links */
export function whatsappDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
