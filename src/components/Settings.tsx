import React, { FC, useState, useMemo, useCallback, useEffect } from 'react';
import { st_echo } from 'sillytavern-utils-lib/config';
import {
  PresetItem,
  SortableListItemData,
  STButton,
  STPresetSelect,
  STSortableList,
  STTextarea,
} from 'sillytavern-utils-lib/components';

import {
  convertToVariableName,
  DEFAULT_PROMPT_CONTENTS,
  DEFAULT_SETTINGS,
  ExtensionSettings,
  MainContextPromptBlock,
  MainContextTemplatePreset,
  MessageRole,
  PromptSetting,
  settingsManager,
  SYSTEM_PROMPT_KEYS,
} from '../settings.js';
import { useForceUpdate } from '../hooks/useForceUpdate.js';

// NOTE: moved inside component to avoid hard failure if SillyTavern not ready at import time.
// const globalContext = SillyTavern.getContext();

export const NarratorSettings: FC = () => {
  const globalContext: any =
    (window as any).SillyTavern?.getContext?.() ||
    {}; // fallback empty object if not yet ready

  // --- State Management ---
  const forceUpdate = useForceUpdate();
  const settings = settingsManager.getSettings();
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<string>(SYSTEM_PROMPT_KEYS[0]);

  const updateAndRefresh = useCallback(
    (updater: (currentSettings: ExtensionSettings) => void) => {
      const currentSettings = settingsManager.getSettings();
      updater(currentSettings);
      settingsManager.saveSettings();
      forceUpdate();
    },
    [forceUpdate],
  );

  // --- Diagnostics (Auto-mode visibility) ---
  useEffect(() => {
    const el = document.getElementById('narrator-auto-mode-section');
    const style = el ? window.getComputedStyle(el) : null;
    // Only log once per mount / settings change cluster
    console.log('[NarratorSettings][debug] Render cycle', {
      autoModeFlag: settings.autoMode,
      autoModePrompt: settings.autoModePrompt,
      autoModeDelayMs: settings.autoModeDelayMs,
      autoModeElementFound: !!el,
      elementDisplay: style?.display,
      elementVisibility: style?.visibility,
      elementOffsetHeight: el?.offsetHeight,
    });

    // If element exists but has zero height, highlight it for debugging
    if (el && el.offsetHeight === 0) {
      el.style.outline = '2px dashed #ffbf00';
      el.style.outlineOffset = '2px';
      console.warn(
        '[NarratorSettings][debug] Auto-mode section found but collapsed (height=0). Check parent CSS rules.',
      );
    }
  }, [settings.autoMode, settings.autoModePrompt, settings.autoModeDelayMs]);

  // --- Derived Data ---
  const mainContextPresetItems = useMemo(
    (): PresetItem[] =>
      Object.keys(settings.mainContextTemplatePresets).map((key) => ({
        value: key,
        label: key,
      })),
    [settings.mainContextTemplatePresets],
  );

  const systemPromptItems = useMemo(
    (): PresetItem[] =>
      Object.keys(settings.prompts).map((key) => {
        const prompt = settings.prompts[key];
        return {
          value: key,
          label: prompt ? `${prompt.label} (${key})` : key,
        };
      }),
    [settings.prompts],
  );

  const mainContextListItems = useMemo((): SortableListItemData[] => {
    const preset = settings.mainContextTemplatePresets[settings.mainContextTemplatePreset];
    if (!preset) return [];
    return preset.prompts.map((prompt) => {
      const promptSetting = settings.prompts[prompt.promptName];
      const label = promptSetting ? `${promptSetting.label} (${prompt.promptName})` : prompt.promptName;
      return {
        id: prompt.promptName,
        label,
        enabled: prompt.enabled,
        selectValue: prompt.role,
        selectOptions: [
          { value: 'user', label: 'User' },
            { value: 'assistant', label: 'Assistant' },
          { value: 'system', label: 'System' },
        ],
      };
    });
  }, [settings.mainContextTemplatePreset, settings.mainContextTemplatePresets, settings.prompts]);

  // --- Main Context Handlers ---
  const handleMainContextPresetChange = (newValue?: string) => {
    updateAndRefresh((s) => {
      s.mainContextTemplatePreset = newValue ?? 'default';
    });
  };

  const handleMainContextPresetsChange = (newItems: PresetItem[]) => {
    updateAndRefresh((s) => {
      const newPresets: Record<string, MainContextTemplatePreset> = {};
      const oldPresets = s.mainContextTemplatePresets;
      newItems.forEach((item) => {
        newPresets[item.value] =
          oldPresets[item.value] ?? structuredClone(oldPresets[s.mainContextTemplatePreset] ?? oldPresets['default']);
      });
      s.mainContextTemplatePresets = newPresets;
    });
  };

  const handleMainContextListChange = (newListItems: SortableListItemData[]) => {
    updateAndRefresh((s) => {
      const newPrompts: MainContextPromptBlock[] = newListItems.map((item) => ({
        promptName: item.id,
        enabled: item.enabled,
        role: (item.selectValue as MessageRole) ?? 'user',
      }));
      const updatedPreset = {
        ...s.mainContextTemplatePresets[s.mainContextTemplatePreset],
        prompts: newPrompts,
      };
      s.mainContextTemplatePresets = {
        ...s.mainContextTemplatePresets,
        [s.mainContextTemplatePreset]: updatedPreset,
      };
    });
  };

  const handleRestoreMainContextDefault = async () => {
    const confirmed = await globalContext?.Popup?.show?.confirm?.('Restore default', 'Are you sure?');
    if (!confirmed) return;
    updateAndRefresh((s) => {
      s.mainContextTemplatePresets = {
        ...s.mainContextTemplatePresets,
        default: structuredClone(DEFAULT_SETTINGS.mainContextTemplatePresets['default']),
      };
      s.mainContextTemplatePreset = 'default';
    });
  };

  // --- System Prompts Handlers ---
  const handleSystemPromptsChange = (newItems: PresetItem[]) => {
    updateAndRefresh((s) => {
      const newPrompts: Record<string, PromptSetting> = {};
      const oldPrompts = s.prompts;
      const oldKeys = Object.keys(oldPrompts);
      const newKeys = newItems.map((item) => item.value);
      newKeys.forEach((key) => {
        newPrompts[key] = oldPrompts[key] ?? { content: '', isDefault: false, label: key };
      });
      // @ts-ignore
      s.prompts = newPrompts;
      const deletedKeys = oldKeys.filter((key) => !newKeys.includes(key));
      if (deletedKeys.length > 0) {
        const updatedPresets = Object.fromEntries(
          Object.entries(s.mainContextTemplatePresets).map(([presetName, preset]) => [
            presetName,
            {
              ...preset,
              prompts: preset.prompts.filter((p) => !deletedKeys.includes(p.promptName)),
            },
          ]),
        );
        s.mainContextTemplatePresets = updatedPresets;
      }
    });
  };

  const handleSystemPromptCreate = (value: string) => {
    const variableName = convertToVariableName(value);
    if (!variableName) {
      st_echo('error', `Invalid prompt name: ${value}`);
      return { confirmed: false };
    }
    if (settings.prompts[variableName]) {
      st_echo('error', `Prompt name already exists: ${variableName}`);
      return { confirmed: false };
    }
    updateAndRefresh((s) => {
      s.prompts = {
        ...s.prompts,
        [variableName]: {
          content: s.prompts[selectedSystemPrompt]?.content ?? '',
          isDefault: false,
          label: value,
        },
      };
      s.mainContextTemplatePresets = Object.fromEntries(
        Object.entries(s.mainContextTemplatePresets).map(([presetName, preset]) => [
          presetName,
          {
            ...preset,
            prompts: [...preset.prompts, { enabled: true, promptName: variableName, role: 'user' }],
          },
        ]),
      );
    });
    setSelectedSystemPrompt(variableName);
    return { confirmed: true, value: variableName };
  };

  const handleSystemPromptRename = (oldValue: string, newValue: string) => {
    const variableName = convertToVariableName(newValue);
    if (!variableName) {
      st_echo('error', `Invalid prompt name: ${newValue}`);
      return { confirmed: false };
    }
    if (settings.prompts[variableName]) {
      st_echo('error', `Prompt name already exists: ${variableName}`);
      return { confirmed: false };
    }
    updateAndRefresh((s) => {
      const { [oldValue]: renamedPrompt, ...restPrompts } = s.prompts;
      // @ts-ignore
      s.prompts = {
        ...restPrompts,
        [variableName]: { ...renamedPrompt, label: newValue },
      };
      s.mainContextTemplatePresets = Object.fromEntries(
        Object.entries(s.mainContextTemplatePresets).map(([presetName, preset]) => [
          presetName,
          {
            ...preset,
            prompts: preset.prompts.map((p) => (p.promptName === oldValue ? { ...p, promptName: variableName } : p)),
          },
        ]),
      );
    });
    setSelectedSystemPrompt(variableName);
    return { confirmed: true, value: variableName };
  };

  const handleSystemPromptContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    updateAndRefresh((s) => {
      const prompt = s.prompts[selectedSystemPrompt];
      if (prompt) {
        s.prompts = {
          ...s.prompts,
          [selectedSystemPrompt]: {
            ...prompt,
            content: newContent,
            isDefault: SYSTEM_PROMPT_KEYS.includes(selectedSystemPrompt as any)
              ? DEFAULT_PROMPT_CONTENTS[selectedSystemPrompt as keyof typeof DEFAULT_PROMPT_CONTENTS] === newContent
              : false,
          },
        };
      }
    });
  };

  const handleRestoreSystemPromptDefault = async () => {
    const prompt = settings.prompts[selectedSystemPrompt];
    if (!prompt) return st_echo('warning', 'No prompt selected.');
    const confirmed = await globalContext?.Popup?.show?.confirm?.(
      'Restore Default',
      `Restore default for "${prompt.label}"?`,
    );
    if (confirmed) {
      updateAndRefresh((s) => {
        s.prompts = {
          ...s.prompts,
          [selectedSystemPrompt]: {
            ...s.prompts[selectedSystemPrompt],
            content: DEFAULT_PROMPT_CONTENTS[selectedSystemPrompt as keyof typeof DEFAULT_PROMPT_CONTENTS],
          },
        };
      });
    }
  };

  // --- Reset Handler ---
  const handleResetEverything = async () => {
    const confirmed = await globalContext?.Popup?.show?.confirm?.(
      'Reset Everything',
      'Are you sure? This cannot be undone.',
    );
    if (confirmed) {
      settingsManager.resetSettings();
      forceUpdate();
      st_echo('success', 'Settings reset. The UI has been updated.');
    }
  };

  const selectedPromptContent = settings.prompts[selectedSystemPrompt]?.content ?? '';
  // @ts-ignore
  const isDefaultSystemPromptSelected = SYSTEM_PROMPT_KEYS.includes(selectedSystemPrompt);

  return (
    <div className="world-info-recommender-settings">
      {/* Auto-mode Section */}
      <div id="narrator-auto-mode-section" style={{ marginTop: '5px', marginBottom: '15px' }}>
        <div className="title_restorable">
          <span>Auto-mode</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            marginTop: '6px',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={settings.autoMode}
              onChange={(e) =>
                updateAndRefresh((s) => {
                  s.autoMode = e.target.checked;
                })
              }
            />
            <span style={{ fontSize: '0.9em' }}>Enable</span>
          </label>

          <input
            type="text"
            style={{
              flex: '1 1 280px',
              minWidth: '240px',
              padding: '4px 6px',
            }}
            placeholder="Auto-mode prompt (leave empty for generic)"
            value={settings.autoModePrompt}
            onChange={(e) =>
              updateAndRefresh((s) => {
                s.autoModePrompt = e.target.value;
              })
            }
          />

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.9em' }}>Delay (ms)</span>
            <input
              type="number"
              min={0}
              style={{ width: '110px', padding: '4px 6px' }}
              value={settings.autoModeDelayMs}
              onChange={(e) =>
                updateAndRefresh((s) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) {
                    s.autoModeDelayMs = Math.max(0, v);
                  }
                })
              }
            />
          </label>
        </div>
        <div style={{ fontSize: '0.75em', opacity: 0.8, marginTop: '4px' }}>
          When enabled, after each completed assistant/character message a narration suggestion list is generated, one
          option is chosen at random, and published to the chat automatically.
        </div>
      </div>

      {/* Main Context Template */}
      <div style={{ marginTop: '10px' }}>
        <div className="title_restorable">
          <span>Main Context Template</span>
          <STButton
            className="fa-solid fa-undo"
            title="Restore main context template to default"
            onClick={handleRestoreMainContextDefault}
          />
        </div>
        <STPresetSelect
          label="Template"
          items={mainContextPresetItems}
          value={settings.mainContextTemplatePreset}
          readOnlyValues={['default']}
          onChange={handleMainContextPresetChange}
          onItemsChange={handleMainContextPresetsChange}
          enableCreate
          enableRename
          enableDelete
        />
        <div style={{ marginTop: '5px' }}>
          <STSortableList
            items={mainContextListItems}
            onItemsChange={handleMainContextListChange}
            showSelectInput
            showToggleButton
          />
        </div>
      </div>

      <hr style={{ margin: '10px 0' }} />

      {/* Prompt Templates */}
      <div style={{ marginTop: '10px' }}>
        <div className="title_restorable">
          <span>Prompt Templates</span>
          {isDefaultSystemPromptSelected && (
            <STButton
              className="fa-solid fa-undo"
              title="Restore selected prompt to default"
              onClick={handleRestoreSystemPromptDefault}
            />
          )}
        </div>
        <STPresetSelect
          label="Prompt"
          items={systemPromptItems}
          value={selectedSystemPrompt}
          readOnlyValues={SYSTEM_PROMPT_KEYS}
          onChange={(newValue) => setSelectedSystemPrompt(newValue ?? '')}
          onItemsChange={handleSystemPromptsChange}
          enableCreate
          enableRename
          enableDelete
          onCreate={handleSystemPromptCreate}
          onRename={handleSystemPromptRename}
        />
        <STTextarea
          value={selectedPromptContent}
          onChange={handleSystemPromptContentChange}
          placeholder="Edit the selected system prompt template here..."
          rows={6}
          style={{ marginTop: '5px', width: '100%' }}
        />
      </div>

      <hr style={{ margin: '15px 0' }} />

      <div style={{ textAlign: 'center', marginTop: '15px' }}>
        <STButton className="danger_button" style={{ width: 'auto' }} onClick={handleResetEverything}>
          <i style={{ marginRight: '10px' }} className="fa-solid fa-triangle-exclamation" />
          I messed up, reset everything
        </STButton>
      </div>
    </div>
  );
};
