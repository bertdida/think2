export type Think2PageVariant = "live" | "demo";

const SHARED_TOP = `
      <div id="shareLoadError" class="share-load-error" role="alert" hidden></div>
      <div id="shareViewBanner" class="share-view-banner" hidden>
        <p>
          <strong>Shared session.</strong> This page shows a saved result only.
          Your OpenRouter key is not used here.
        </p>
      </div>
`;

const DEMO_CALLOUT = `
      <p class="demo-callout" role="note" id="demoCallout">
        You are on the <strong>demo</strong> page: one sample situation and
        canned planner–challenger–resolver text. Nothing is sent to OpenRouter
        or anywhere else from this page.
      </p>
`;

const SETUP_HEAD = `
      <section
        class="setup-panel"
        id="setupPanel"
        aria-labelledby="setup-heading"
      >
        <h2 id="setup-heading">Session setup</h2>
        <form id="debateForm" onsubmit="return false;">
          <div class="field" id="apiKeyFieldWrap">
            <label for="apiKey">OpenRouter API key</label>
            <div class="api-key-wrap">
              <input
                type="password"
                id="apiKey"
                name="apiKey"
                placeholder="sk-or-..."
                autocomplete="off"
                spellcheck="false"
              />
              <button
                type="button"
                class="api-key-toggle"
                id="btnApiKeyToggle"
                aria-pressed="false"
                aria-label="Show API key as plain text"
                title="Show key"
              ></button>
            </div>
            <p class="key-warning">
              Used only in this tab for OpenRouter. Not saved — gone after
              reload.
            </p>
          </div>

          <div class="models-row">
            <div class="field">
              <label for="strategistModel">Planner model</label>
              <select id="strategistModel" name="strategistModel"></select>
              <div class="model-tag s">Planner</div>
            </div>
            <div class="field">
              <label for="criticModel">Challenger model</label>
              <select id="criticModel" name="criticModel"></select>
              <div class="model-tag c">Challenger</div>
            </div>
          </div>

          <div class="field">
            <label for="synthesizerModel">Resolver model</label>
            <select id="synthesizerModel" name="synthesizerModel"></select>
            <div class="model-tag y">Final step — resolution</div>
          </div>
`;

const BRIEF_LIVE = `
          <div class="field">
            <label for="brief">Your situation</label>
            <textarea
              id="brief"
              name="brief"
              placeholder="Describe what is going on, what you have tried, and what you want decided."
            ></textarea>
            <div class="brief-actions">
              <button type="button" class="brief-action" id="btnBriefClear">
                Clear
              </button>
              <button type="button" class="brief-action" id="btnBriefNext">
                Next sample
              </button>
            </div>
          </div>
`;

const BRIEF_DEMO = `
          <div class="field">
            <label for="brief">Your situation</label>
            <textarea
              id="brief"
              name="brief"
              readonly
              spellcheck="false"
              placeholder="Describe what is going on, what you have tried, and what you want decided."
            ></textarea>
            <div class="brief-actions">
              <button
                type="button"
                class="brief-action"
                id="btnBriefClear"
                disabled
              >
                Clear
              </button>
              <button
                type="button"
                class="brief-action"
                id="btnBriefNext"
                disabled
              >
                Next sample
              </button>
            </div>
          </div>
`;

const SETUP_TAIL = `
          <button class="btn-start" id="btnStart" type="button">
            Get my recommendation
          </button>
          <div
            class="error-msg"
            id="errorMsg"
            role="status"
            aria-live="polite"
          ></div>
        </form>
      </section>

      <section class="debate" aria-label="How we got there">
        <div class="timeline" id="timeline"></div>
        <div class="session-usage" id="sessionUsage" hidden></div>
      </section>

      <div id="sessionDoneActions" class="session-done-actions" hidden>
        <button type="button" class="btn-share" id="btnShareLink">
          Copy share link
        </button>
        <button class="btn-reset" id="btnReset" type="button">New session</button>
      </div>
      <p class="share-link-hint" id="shareLinkHint" hidden>
        Anyone with the link can read your situation and every model reply.
      </p>
`;

/**
 * Injects the shared think2 main markup into \`main\`. Call once before app or demo wiring.
 */
export function mountThink2Page(
  main: HTMLElement,
  variant: Think2PageVariant,
): void {
  const brief = variant === "demo" ? BRIEF_DEMO : BRIEF_LIVE;
  const prefix =
    variant === "demo" ? `${SHARED_TOP}${DEMO_CALLOUT}` : SHARED_TOP;
  main.innerHTML = `${prefix}${SETUP_HEAD}${brief}${SETUP_TAIL}`;
}
