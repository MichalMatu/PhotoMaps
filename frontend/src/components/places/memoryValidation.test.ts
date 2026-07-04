import { describe, expect, it } from "vitest";

import {
  CLAIM_TOKEN_MAX_LENGTH,
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
  hasMemoryFieldErrors,
  validateClaimToken,
  validateMemoryEditForm,
  validateMemoryUploadForm,
} from "./memoryValidation";

describe("memory validation", () => {
  it("keeps upload validation attached to fields", () => {
    const errors = validateMemoryUploadForm({
      audioFile: null,
      authorCity: "x".repeat(MEMORY_AUTHOR_MAX_LENGTH + 1),
      authorName: "x".repeat(MEMORY_AUTHOR_MAX_LENGTH + 1),
      caption: " ",
      file: null,
      hasConsent: false,
      memoryText: "x".repeat(MEMORY_TEXT_MAX_LENGTH + 1),
    });

    expect(errors).toEqual({
      authorCity: `Miasto może mieć maksymalnie ${MEMORY_AUTHOR_MAX_LENGTH} znaków.`,
      authorName: `Imię może mieć maksymalnie ${MEMORY_AUTHOR_MAX_LENGTH} znaków.`,
      caption: "Podpis jest wymagany.",
      file: "Dodaj zdjęcie pamiątki.",
      hasConsent: "Potwierdź zgodę na publikację.",
      memoryText: `Myśl / wspomnienie może mieć maksymalnie ${MEMORY_TEXT_MAX_LENGTH} znaków.`,
    });
    expect(hasMemoryFieldErrors(errors)).toBe(true);
  });

  it("validates owner edit fields without upload-only requirements", () => {
    expect(
      validateMemoryEditForm({
        authorCity: "",
        authorName: "",
        caption: "x".repeat(MEMORY_CAPTION_MAX_LENGTH + 1),
        memoryText: "",
      }),
    ).toEqual({
      caption: `Podpis może mieć maksymalnie ${MEMORY_CAPTION_MAX_LENGTH} znaków.`,
      memoryText: "Myśl / wspomnienie jest wymagane.",
    });
  });

  it("validates claim token length", () => {
    expect(validateClaimToken("short")).toEqual({ claimToken: "Token musi mieć minimum 8 znaków." });
    expect(validateClaimToken("x".repeat(CLAIM_TOKEN_MAX_LENGTH + 1))).toEqual({
      claimToken: `Token może mieć maksymalnie ${CLAIM_TOKEN_MAX_LENGTH} znaki.`,
    });
  });
});
