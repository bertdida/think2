const SCROLL_BOTTOM_TOLERANCE_PX = 64;

let timelineScrollFollow = false;
let timelineScrollFollowListenerInstalled = false;

function syncTimelineScrollFollowFromScrollPosition(): void {
  timelineScrollFollow = isDocumentPinnedToBottom(document.scrollingElement);
}

/**
 * Keeps `timelineScrollFollow` in sync with whether the viewport is pinned to
 * the document bottom. Auto-scroll runs only while this is true, except when
 * {@link setTimelineScrollFollow} is used to opt in at run start.
 */
export function ensureTimelineScrollFollowListener(): void {
  if (typeof window === "undefined") return;
  if (timelineScrollFollowListenerInstalled) return;
  timelineScrollFollowListenerInstalled = true;
  const onScroll = () => {
    syncTimelineScrollFollowFromScrollPosition();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  syncTimelineScrollFollowFromScrollPosition();
}

/** Opt in/out of timeline auto-scroll (e.g. true when a live/demo run starts). */
export function setTimelineScrollFollow(follow: boolean): void {
  timelineScrollFollow = follow;
}

/** Scrolls the main document so the latest timeline content is in view. */
export function scrollDocumentToBottom(): void {
  const root = document.scrollingElement;
  if (!root) return;
  root.scrollTop = root.scrollHeight;
}

/** Like {@link scrollDocumentToBottom} but only when the user is following the timeline. */
export function scrollTimelineToBottomIfFollowing(): void {
  if (!timelineScrollFollow) return;
  scrollDocumentToBottom();
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isDocumentPinnedToBottom(root: Element | null): boolean {
  if (!root) return true;
  const gap = root.scrollHeight - root.scrollTop - root.clientHeight;
  return gap <= SCROLL_BOTTOM_TOLERANCE_PX;
}

export interface StreamRenderer {
  push(chunk: string): void;
  cancel(): void;
  finish(): string;
}

export function createStreamRenderer(contentEl: HTMLElement): StreamRenderer {
  const textSpan = document.createElement("span");
  textSpan.className = "stream-text";
  const cursorSpan = document.createElement("span");
  cursorSpan.className = "cursor";
  contentEl.replaceChildren(textSpan, cursorSpan);

  let fullText = "";
  let raf = 0;
  let scrollRaf = 0;

  const flushText = () => {
    raf = 0;
    textSpan.textContent = fullText;
  };

  const flushScroll = () => {
    scrollRaf = 0;
    if (timelineScrollFollow) {
      scrollDocumentToBottom();
    }
  };

  return {
    push(chunk: string) {
      if (!chunk) return;
      fullText += chunk;
      if (raf === 0) raf = requestAnimationFrame(flushText);
      if (scrollRaf === 0) scrollRaf = requestAnimationFrame(flushScroll);
    },
    cancel() {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      if (scrollRaf !== 0) cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    },
    finish() {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      if (scrollRaf !== 0) cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
      textSpan.textContent = fullText;
      contentEl.replaceChildren(textSpan);
      scrollTimelineToBottomIfFollowing();
      return fullText;
    },
  };
}

export interface RoundDisplay {
  id: string;
  speaker: string;
  cls: string;
  label: string;
}

export interface AppendRoundCardResult {
  card: HTMLDivElement;
  contentEl: HTMLElement;
  typingEl: HTMLElement;
}

export function appendRoundCard(
  roundDisplay: RoundDisplay,
): AppendRoundCardResult {
  const timeline = document.getElementById("timeline");
  if (!timeline) {
    throw new Error("Missing element #timeline");
  }

  const card = document.createElement("div");
  card.className = `round-card ${roundDisplay.cls} visible`;
  card.id = roundDisplay.id;
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-header">
        <span class="speaker-label">${escapeHtml(roundDisplay.speaker)}</span>
        <span class="round-badge">${escapeHtml(roundDisplay.label)}</span>
        <div class="typing-indicator" id="typing-${roundDisplay.id}">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="card-content" id="content-${roundDisplay.id}"></div>
    </div>
  `;
  timeline.appendChild(card);

  requestAnimationFrame(() => {
    card.classList.add("animated");
    scrollTimelineToBottomIfFollowing();
  });

  const contentEl = document.getElementById(`content-${roundDisplay.id}`);
  const typingEl = document.getElementById(`typing-${roundDisplay.id}`);
  if (!contentEl || !typingEl) {
    throw new Error("appendRoundCard: content or typing node missing");
  }

  return { card, contentEl, typingEl };
}
