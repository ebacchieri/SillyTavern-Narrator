import { settingsManager } from './settings.js';
import { runWorldInfoRecommendation } from './generate.js';
import { NEntry } from './types.js';
import { BuildPromptOptions } from 'sillytavern-utils-lib';

// Helper: build options roughly mirroring manual generation logic.
// Adjust if your UI uses a different subset of context signals.
function buildOptionsFromSettings(): BuildPromptOptions {
  const s = settingsManager.getSettings();
  const ctx = s.contextToSend;
  return {
    include: {
      stDescription: ctx.stDescription,
      messages: ctx.messages,
      charCard: ctx.charCard,
      authorNote: ctx.authorNote,
      worldInfo: ctx.worldInfo,
      suggestedEntries: ctx.suggestedEntries,
    },
    // Safe baseline; adjust if your manual flow exposes these.
    trimDirection: 'start',
    maxContextType: s.maxContextType,
    maxContextValue: s.maxContextValue,
  } as BuildPromptOptions;
}

let autoModeInitialized = false;
let pendingTimer: number | undefined;

/**
 * Publish a narrator entry into chat using existing SillyTavern APIs.
 * Replace this if you already have a dedicated publish routine elsewhere.
 */
function publishNarratorEntry(entry: NEntry) {
  const context: any = SillyTavern.getContext();
  // Prefer a dedicated narrator/system injection if available.
  if (context?.ChatService?.addNarratorMessage) {
    context.ChatService.addNarratorMessage(entry.content);
    return;
  }
  // Fallback: add as assistant/system style message.
  if (context?.ChatService?.addMessage) {
    context.ChatService.addMessage({
      role: 'assistant',
      name: 'Narrator',
      isNarrator: true,
      data: {},
      text: entry.content,
    });
    return;
  }
  console.warn('[SillyTavern-Narrator] Could not find a publish method; entry not injected.');
}

/**
 * Core auto-mode trigger: generate suggestions and publish one randomly.
 */
async function generateAndPublishAuto() {
  const s = settingsManager.getSettings();
  if (!s.autoMode || !s.profileId) return;

  try {
    const prompt = s.autoModePrompt?.trim() || 'Generate possible next narrative actions.';
    const mainPreset = s.mainContextTemplatePresets[s.mainContextTemplatePreset];
    if (!mainPreset) return;

    const entries: NEntry[] = [];
    const results = await runWorldInfoRecommendation({
      profileId: s.profileId,
      userPrompt: prompt,
      buildPromptOptions: buildOptionsFromSettings(),
      entries,
      promptSettings: s.prompts,
      mainContextList: mainPreset.prompts.filter(p => p.enabled).map(p => ({
        promptName: p.promptName,
        role: p.role,
      })),
      maxResponseToken: s.maxResponseToken,
    });

    if (!results.length) return;
    const chosen = results[Math.floor(Math.random() * results.length)];
    publishNarratorEntry(chosen);
  } catch (err) {
    console.error('[SillyTavern-Narrator] Auto-mode generation failed:', err);
  }
}

/**
 * Determines if a message node corresponds to a completed character (assistant) message.
 * Tailor the selectors to match actual SillyTavern DOM if needed.
 */
function isCompletedCharacterMessage(node: HTMLElement): boolean {
  if (!node) return false;
  if (!node.classList?.contains('mes')) return false;
  if (node.dataset?.role === 'assistant' || node.classList.contains('assistantMes')) {
    if (node.classList.contains('streaming')) return false;
    return true;
  }
  return false;
}

/**
 * Observes chat for new completed assistant messages, then schedules auto generation.
 */
function setupDomObserver() {
  const chatRoot = document.querySelector('#chat') || document.querySelector('#chatAA');
  if (!chatRoot) {
    console.warn('[SillyTavern-Narrator] Chat root not found; retrying in 2s.');
    setTimeout(setupDomObserver, 2000);
    return;
  }

  const observer = new MutationObserver(mutations => {
    if (!settingsManager.getSettings().autoMode) return;

    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLElement && isCompletedCharacterMessage(node)) {
          const delay = settingsManager.getSettings().autoModeDelayMs;
          if (pendingTimer) {
            clearTimeout(pendingTimer);
          }
          pendingTimer = window.setTimeout(() => {
            generateAndPublishAuto();
          }, Math.max(0, delay));
        }
      }
    }
  });

  observer.observe(chatRoot, { childList: true, subtree: true });
  console.log('[SillyTavern-Narrator] Auto-mode DOM observer initialized.');
}

/**
 * Initialize Auto-mode logic. Call from your extension entrypoint after settings initialization.
 */
export function initAutoMode() {
  if (autoModeInitialized) return;
  autoModeInitialized = true;

  const context: any = SillyTavern.getContext();
  const bus = context?.eventBus || context?.EventBus;
  if (bus?.on) {
    const candidateEvents = ['message:assistant:final', 'message:received:assistant', 'chat:message:complete'];
    candidateEvents.forEach(ev => {
      try {
        bus.on(ev, (_payload: any) => {
          if (!settingsManager.getSettings().autoMode) return;
            const delay = settingsManager.getSettings().autoModeDelayMs;
            if (pendingTimer) {
              clearTimeout(pendingTimer);
            }
            pendingTimer = window.setTimeout(() => {
              generateAndPublishAuto();
            }, Math.max(0, delay));
        });
      } catch {
        /* ignore registration failures */
      }
    });
    console.log('[SillyTavern-Narrator] Auto-mode event subscriptions attempted.');
  } else {
    setupDomObserver();
  }
}

/**
 * Injects (or updates) an Auto-mode toggle in a container element.
 * Call this from the UI rendering routine directly before the Main Context Template section.
 */
export function ensureAutoModeToggle(container: HTMLElement) {
  if (!container) return;
  const id = 'narrator-auto-mode-toggle';
  let wrapper = container.querySelector<HTMLElement>(`#${id}`);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';
    wrapper.style.margin = '4px 0 10px';
    wrapper.innerHTML = `
      <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;cursor:pointer;">
        <input type="checkbox" />
        <span>Auto-mode</span>
      </label>
      <input type="text" placeholder="Auto-mode prompt (optional)" style="flex:1;min-width:220px;" />
      <input type="number" min="0" style="width:90px;" title="Delay ms" />
    `;
    container.prepend(wrapper);
    const [checkbox, promptInput, delayInput] = Array.from(wrapper.querySelectorAll('input'));
    const settings = settingsManager.getSettings();
    checkbox.checked = settings.autoMode;
    promptInput.value = settings.autoModePrompt;
    (delayInput as HTMLInputElement).value = String(settings.autoModeDelayMs);

    checkbox.addEventListener('change', () => {
      const s = settingsManager.getSettings();
      s.autoMode = checkbox.checked;
      settingsManager.saveSettings(); // removed argument
    });

    promptInput.addEventListener('change', () => {
      const s = settingsManager.getSettings();
      s.autoModePrompt = promptInput.value;
      settingsManager.saveSettings(); // removed argument
    });

    delayInput.addEventListener('change', () => {
      const s = settingsManager.getSettings();
      const v = parseInt((delayInput as HTMLInputElement).value, 10);
      if (!Number.isNaN(v)) {
        s.autoModeDelayMs = Math.max(0, v);
        settingsManager.saveSettings(); // removed argument
      }
    });
  } else {
    const inputs = wrapper.querySelectorAll('input');
    if (inputs.length >= 3) {
      const s = settingsManager.getSettings();
      (inputs[0] as HTMLInputElement).checked = s.autoMode;
      (inputs[1] as HTMLInputElement).value = s.autoModePrompt;
      (inputs[2] as HTMLInputElement).value = String(s.autoModeDelayMs);
    }
  }
}
