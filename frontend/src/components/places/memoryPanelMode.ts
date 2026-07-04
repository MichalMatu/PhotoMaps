export type MemoryPanelMode = "with-list" | "form-only";

export type MemoryPanelVisibility = {
  loadExistingMemories: boolean;
  showExistingMemories: boolean;
  showHeading: boolean;
};

export function getMemoryPanelVisibility(mode: MemoryPanelMode): MemoryPanelVisibility {
  const showContext = mode === "with-list";

  return {
    loadExistingMemories: showContext,
    showExistingMemories: showContext,
    showHeading: showContext,
  };
}
