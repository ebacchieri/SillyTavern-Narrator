import { ExtensionSettingsManager } from 'sillytavern-utils-lib';
import {
  DEFAULT_ST_DESCRIPTION,
  DEFAULT_NEXT_STEPS,
  DEFAULT_XML_DESCRIPTION,
  DEFAULT_TASK_DESCRIPTION,
} from './constants.js';
import { globalContext } from './generate.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { initAutoMode } from './autoMode.js'; // ADDED

export const extensionName = 'SillyTavern-Narrator';
export const VERSION = '0.0.1';
export const FORMAT_VERSION = 'F_1.3'; // bumped for auto-mode addition

export const KEYS = {
  EXTENSION: 'narrator',
} as const;

export interface ContextToSend {
  stDescription: boolean;
  messages: {
    type: 'none' | 'all' | 'first' | 'last' | 'range';
    first?: number;
    last?: number;
    range?: {
      start: number;
      end: number;
    };
  };
  charCard: boolean;
  authorNote: boolean;
  worldInfo: boolean;
  suggestedEntries: boolean;
}

export interface PromptSetting {
  label: string;
  content: string;
  isDefault: boolean;
}

export interface PromptPreset {
  content: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MainContextPromptBlock {
  promptName: string;
  enabled: boolean;
  role: MessageRole;
}

export interface MainContextTemplatePreset {
  prompts: MainContextPromptBlock[];
}

export interface ExtensionSettings {
  version: string;
  formatVersion: string;
  profileId: string;
  maxContextType: 'profile' | 'sampler' | 'custom';
  maxContextValue: number;
  maxResponseToken: number;
  contextToSend: ContextToSend;
  prompts: {
    stDescription: PromptSetting;
    possibleSteps: PromptSetting;
    responseRules: PromptSetting;
    taskDescription: PromptSetting;
    [key: string]: PromptSetting;
  };
  promptPreset: string;
  promptPresets: Record<string, PromptPreset>;
  mainContextTemplatePreset: string;
  mainContextTemplatePresets: Record<string, MainContextTemplatePreset>;

  // NEW: Auto-mode
  autoMode: boolean;
  autoModePrompt: string;
  autoModeDelayMs: number;
}

export type SystemPromptKey =
  | 'stDescription'
  | 'possibleSteps'
  | 'responseRules'
  | 'taskDescription';

export const SYSTEM_PROMPT_KEYS: Array<SystemPromptKey> = [
  'stDescription',
  'possibleSteps',
  'responseRules',
  'taskDescription',
];

export const DEFAULT_PROMPT_CONTENTS: Record<SystemPromptKey, string> = {
  stDescription: DEFAULT_ST_DESCRIPTION,
  possibleSteps: DEFAULT_NEXT_STEPS,
  responseRules: DEFAULT_XML_DESCRIPTION,
  taskDescription: DEFAULT_TASK_DESCRIPTION,
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: VERSION,
  formatVersion: FORMAT_VERSION,
  profileId: '',
  maxContextType: 'profile',
  maxContextValue: 16384,
  maxResponseToken: 8192,
  contextToSend: {
    stDescription: true,
    messages: {
      type: 'all',
      first: 10,
      last: 10,
      range: {
        start: 0,
        end: 10,
      },
    },
    charCard: true,
    authorNote: true,
    worldInfo: true,
    suggestedEntries: true,
  },
  prompts: {
    stDescription: {
      label: 'SillyTavern Description',
      content: DEFAULT_PROMPT_CONTENTS.stDescription,
      isDefault: true,
    },
    possibleSteps: {
      label: 'Current FD',
      content: DEFAULT_PROMPT_CONTENTS.possibleSteps,
      isDefault: true,
    },
    responseRules: {
      label: 'Response Rules',
      content: DEFAULT_PROMPT_CONTENTS.responseRules,
      isDefault: true,
    },
    taskDescription: {
      label: 'Task Description',
      content: DEFAULT_PROMPT_CONTENTS.taskDescription,
      isDefault: true,
    },
  },
  promptPreset: 'default',
  promptPresets: {
    default: {
      content: '',
    },
  },
  mainContextTemplatePreset: 'default',
  mainContextTemplatePresets: {
    default: {
      prompts: [
        {
          promptName: 'chatHistory',
          enabled: true,
          role: 'system',
        },
        {
          promptName: 'stDescription',
            enabled: true,
          role: 'system',
        },
        {
          promptName: 'responseRules',
          enabled: true,
          role: 'system',
        },
        {
          promptName: 'taskDescription',
          enabled: true,
          role: 'user',
        },
      ],
    },
  },

  // NEW defaults for auto-mode
  autoMode: false,
  autoModePrompt: '',
  autoModeDelayMs: 1200,
};

export function convertToVariableName(key: string) {
  const normalized = key.replace(/[^\w\s]/g, '');
  const parts = normalized.split(/\s+/).filter(Boolean);
  let firstWordPrinted = false;
  return parts
    .map((word, _) => {
      const cleanWord = word.replace(/^\d+/, '');
      if (cleanWord) {
        const result = firstWordPrinted
          ? `${cleanWord[0].toUpperCase()}${cleanWord.slice(1).toLowerCase()}`
          : cleanWord.toLowerCase();
        if (!firstWordPrinted) {
          firstWordPrinted = true;
        }
        return result;
      }
      return '';
    })
    .join('');
}

export const settingsManager = new ExtensionSettingsManager<ExtensionSettings>(KEYS.EXTENSION, DEFAULT_SETTINGS);

export function isAutoModeEnabled(): boolean {
  return !!settingsManager.getSettings().autoMode;
}

export async function initializeSettings(): Promise<void> {
  return new Promise((resolve, _reject) => {
    settingsManager
      .initializeSettings({
        strategy: [
          {
            from: 'F_1.0',
            to: 'F_1.1',
            action(previous) {
              const migrated = {
                ...DEFAULT_SETTINGS,
                ...previous,
              };
              delete migrated.stWorldInfoPrompt;
              delete migrated.usingDefaultStWorldInfoPrompt;
              delete migrated.lorebookDefinitionPrompt;
              delete migrated.usingDefaultLorebookDefinitionPrompt;
              delete migrated.lorebookRulesPrompt;
              delete migrated.usingDefaultLorebookRulesPrompt;
              delete migrated.responseRulesPrompt;
              delete migrated.usingDefaultResponseRulesPrompt;

              return migrated;
            },
          },
          {
            from: 'F_1.1',
            to: 'F_1.2',
            action(previous) {
              const migrated = { ...previous };
              migrated.formatVersion = 'F_1.2';

              const OLD_TASK_DESCRIPTION = `## Rules
- Don't suggest already existing or suggested entries.

## Your Task
{{userInstructions}}`;

              if (migrated.prompts.taskDescription.content === OLD_TASK_DESCRIPTION) {
                migrated.prompts.taskDescription.content = DEFAULT_PROMPT_CONTENTS.taskDescription;
                migrated.prompts.taskDescription.isDefault = true;
              } else {
                migrated.prompts.taskDescription.isDefault = false;
              }

              return migrated;
            },
          },
          {
            from: 'F_1.2',
            to: 'F_1.3',
            action(previous) {
              const migrated: any = { ...previous };
              migrated.formatVersion = 'F_1.3';
              if (typeof migrated.autoMode !== 'boolean') {
                migrated.autoMode = DEFAULT_SETTINGS.autoMode;
              }
              if (typeof migrated.autoModePrompt !== 'string') {
                migrated.autoModePrompt = DEFAULT_SETTINGS.autoModePrompt;
              }
              if (typeof migrated.autoModeDelayMs !== 'number') {
                migrated.autoModeDelayMs = DEFAULT_SETTINGS.autoModeDelayMs;
              }
              return migrated;
            },
          },
        ],
      })
      .then((_result) => {
        // Initialize auto-mode hooks after settings are fully ready.
        try {
          initAutoMode();
        } catch (e) {
          console.warn('[SillyTavern-Narrator] Failed to initialize auto-mode:', e);
        }
        resolve();
      })
      .catch((error) => {
        console.error(`[${extensionName}] Error initializing settings:`, error);
        st_echo('error', `[${extensionName}] Failed to initialize settings: ${error.message}`);
        globalContext.Popup.show
          .confirm(
            `[${extensionName}] Failed to load settings. This might be due to an update. Reset settings to default?`,
            'Extension Error',
          )
          .then((result: boolean) => {
            if (result) {
              settingsManager.resetSettings();
              st_echo('success', `[${extensionName}] Settings reset. Reloading may be required.`);
              // Attempt auto-mode init after reset (safe due to internal guard).
              try {
                initAutoMode();
              } catch (e) {
                console.warn('[SillyTavern-Narrator] Auto-mode init after reset failed:', e);
              }
              resolve();
            }
          });
      });
  });
}
