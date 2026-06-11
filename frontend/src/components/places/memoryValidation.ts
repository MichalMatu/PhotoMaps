export const CLAIM_TOKEN_MIN_LENGTH = 8;
export const CLAIM_TOKEN_MAX_LENGTH = 64;
export const MEMORY_AUTHOR_MAX_LENGTH = 40;
export const MEMORY_CAPTION_MAX_LENGTH = 80;
export const MEMORY_TEXT_MAX_LENGTH = 240;

export type MemoryUploadFields = {
  authorCity: string;
  authorName: string;
  caption: string;
  file: File | null;
  hasConsent: boolean;
  memoryText: string;
};

export type MemoryEditFields = Omit<MemoryUploadFields, "file" | "hasConsent">;

export type MemoryFieldErrors = Partial<Record<keyof MemoryUploadFields | "claimToken", string>>;

export function hasMemoryFieldErrors(errors: MemoryFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function validateClaimToken(claimToken: string): Pick<MemoryFieldErrors, "claimToken"> {
  const normalizedToken = claimToken.trim();
  if (normalizedToken.length < CLAIM_TOKEN_MIN_LENGTH) {
    return { claimToken: `Token musi mieć minimum ${CLAIM_TOKEN_MIN_LENGTH} znaków.` };
  }
  if (normalizedToken.length > CLAIM_TOKEN_MAX_LENGTH) {
    return { claimToken: `Token może mieć maksymalnie ${CLAIM_TOKEN_MAX_LENGTH} znaki.` };
  }
  return {};
}

function validateCaption(caption: string): Pick<MemoryFieldErrors, "caption"> {
  const normalizedCaption = caption.trim();
  if (!normalizedCaption) {
    return { caption: "Podpis jest wymagany." };
  }
  if (normalizedCaption.length > MEMORY_CAPTION_MAX_LENGTH) {
    return { caption: `Podpis może mieć maksymalnie ${MEMORY_CAPTION_MAX_LENGTH} znaków.` };
  }
  return {};
}

function validateMemoryText(memoryText: string): Pick<MemoryFieldErrors, "memoryText"> {
  const normalizedMemoryText = memoryText.trim();
  if (!normalizedMemoryText) {
    return { memoryText: "Myśl / wspomnienie jest wymagane." };
  }
  if (normalizedMemoryText.length > MEMORY_TEXT_MAX_LENGTH) {
    return { memoryText: `Myśl / wspomnienie może mieć maksymalnie ${MEMORY_TEXT_MAX_LENGTH} znaków.` };
  }
  return {};
}

function validateAuthorFields(
  authorName: string,
  authorCity: string,
): Pick<MemoryFieldErrors, "authorName" | "authorCity"> {
  const errors: Pick<MemoryFieldErrors, "authorName" | "authorCity"> = {};
  if (authorName.trim().length > MEMORY_AUTHOR_MAX_LENGTH) {
    errors.authorName = `Imię może mieć maksymalnie ${MEMORY_AUTHOR_MAX_LENGTH} znaków.`;
  }
  if (authorCity.trim().length > MEMORY_AUTHOR_MAX_LENGTH) {
    errors.authorCity = `Miasto może mieć maksymalnie ${MEMORY_AUTHOR_MAX_LENGTH} znaków.`;
  }
  return errors;
}

export function validateMemoryUploadForm(fields: MemoryUploadFields): MemoryFieldErrors {
  return {
    ...(!fields.file ? { file: "Dodaj zdjęcie pamiątki." } : {}),
    ...validateCaption(fields.caption),
    ...validateMemoryText(fields.memoryText),
    ...validateAuthorFields(fields.authorName, fields.authorCity),
    ...(!fields.hasConsent ? { hasConsent: "Potwierdź zgodę na publikację." } : {}),
  };
}

export function validateMemoryEditForm(fields: MemoryEditFields): MemoryFieldErrors {
  return {
    ...validateCaption(fields.caption),
    ...validateMemoryText(fields.memoryText),
    ...validateAuthorFields(fields.authorName, fields.authorCity),
  };
}
