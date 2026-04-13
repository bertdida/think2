export const DEFAULT_SHARE_LABEL = "Copy share link";

const pendingCopiedReset = new WeakMap<HTMLButtonElement, number>();

function clearCopiedResetTimer(btn: HTMLButtonElement): void {
  const id = pendingCopiedReset.get(btn);
  if (id !== undefined) {
    window.clearTimeout(id);
    pendingCopiedReset.delete(btn);
  }
}

/** Clears the post-copy timer and restores the default label (e.g. when hiding session-done chrome). */
export function resetShareCopyButton(btn: HTMLButtonElement): void {
  clearCopiedResetTimer(btn);
  btn.removeAttribute("aria-busy");
  btn.textContent = DEFAULT_SHARE_LABEL;
  btn.disabled = false;
}

export interface ShareCopyUiSession {
  readonly originalLabel: string;
  cancelLoading(): void;
  /** Call after a successful copy; shows "Copied" then restores label and enabled state. */
  showCopiedThenReset(): void;
}

/**
 * Disables the button and shows a loading label while the async copy work runs.
 * Always pair with {@link ShareCopyUiSession.cancelLoading} or {@link ShareCopyUiSession.showCopiedThenReset}.
 */
export function startShareCopyLoading(btn: HTMLButtonElement): ShareCopyUiSession {
  clearCopiedResetTimer(btn);
  const originalLabel = btn.textContent?.trim() || DEFAULT_SHARE_LABEL;
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  btn.textContent = "Copying…";

  return {
    originalLabel,
    cancelLoading() {
      clearCopiedResetTimer(btn);
      btn.removeAttribute("aria-busy");
      btn.textContent = originalLabel;
      btn.disabled = false;
    },
    showCopiedThenReset() {
      clearCopiedResetTimer(btn);
      btn.removeAttribute("aria-busy");
      btn.textContent = "Copied";
      btn.disabled = true;
      const tid = window.setTimeout(() => {
        pendingCopiedReset.delete(btn);
        btn.textContent = originalLabel;
        btn.disabled = false;
      }, 2000);
      pendingCopiedReset.set(btn, tid);
    },
  };
}
