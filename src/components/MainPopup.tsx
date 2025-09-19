import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import {
  STButton,
  STConnectionProfileSelect,
  STFancyDropdown,
  STPresetSelect,
  STTextarea,
  PresetItem,
  DropdownItem as FancyDropdownItem,
  Popup,
} from 'sillytavern-utils-lib/components';
import { BuildPromptOptions } from 'sillytavern-utils-lib';
import {
  selected_group,
  st_createWorldInfoEntry,
  st_echo,
  st_getCharaFilename,
  this_chid,
} from 'sillytavern-utils-lib/config';
import { NEntry } from '../types.js';

import { runWorldInfoRecommendation } from '../generate.js';
import { ExtensionSettings, settingsManager } from '../settings.js';
// @ts-ignore
import { Handlebars } from '../../../../../lib.js';
import { useForceUpdate } from '../hooks/useForceUpdate.js';
import { SuggestedAction } from './SuggestedAction.js';

if (!Handlebars.helpers['join']) {
  Handlebars.registerHelper('join', function (array: any, separator: any) {
    return array.join(separator);
  });
}

const globalContext = SillyTavern.getContext();
export const comment_avatar = 'img/quill.png';

// Helper to get current character/group avatar filename
const getAvatar = () => (this_chid ? st_getCharaFilename(this_chid) : selected_group);

/**
 * The props for the MainPopup component.
 */
interface MainPopupProps {
  onClose: () => void;
}

/**
 * A React component for the main Narrator entry generator popup UI.
 */
export const MainPopup: FC<MainPopupProps> = ({ onClose }) => {
  // --- State Management ---
  const forceUpdate = useForceUpdate();
  const settings = settingsManager.getSettings();
  const [suggestedActions, setSuggestedActions] = useState<NEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const avatarKey = useMemo(() => getAvatar() ?? '_global', [this_chid, selected_group]);

  // --- Generic Handlers ---
  const updateSetting = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
    // Direct mutation + force update
    settingsManager.getSettings()[key] = value;
    settingsManager.saveSettings();
    forceUpdate();
  };

  const updateContextToSend = <K extends keyof ExtensionSettings['contextToSend']>(
    key: K,
    value: ExtensionSettings['contextToSend'][K],
  ) => {
    // Direct mutation + force update
    settingsManager.getSettings().contextToSend[key] = value;
    settingsManager.saveSettings();
    forceUpdate();
  };

  // --- Memoized Derived Data for UI ---
  const promptPresetItems = useMemo(
    (): PresetItem[] => Object.keys(settings.promptPresets).map((key) => ({ value: key, label: key })),
    [settings.promptPresets],
  );

  // --- Core Logic Callbacks ---
  const handleGeneration = useCallback(
    async (continueFrom?: { entry: NEntry; prompt: string; mode: 'continue' | 'revise' }) => {
      if (!settings.profileId) return st_echo('warning', 'Please select a connection profile.');

      const userPrompt = continueFrom?.prompt ?? settings.promptPresets[settings.promptPreset].content;

      if (!continueFrom && !userPrompt) {
        return st_echo('warning', 'Please enter a prompt.');
      }

      setIsGenerating(true);
      try {
        const profile = globalContext.extensionSettings.connectionManager?.profiles?.find(
          (p) => p.id === settings.profileId,
        );
        if (!profile) throw new Error('Connection profile not found.');

        const avatar = getAvatar();
        const buildPromptOptions: BuildPromptOptions = {
          presetName: profile.preset,
          contextName: profile.context,
          instructName: profile.instruct,
          syspromptName: profile.sysprompt,
          ignoreCharacterFields: !settings.contextToSend.charCard,
          ignoreWorldInfo: !settings.contextToSend.worldInfo,
          ignoreAuthorNote: !settings.contextToSend.authorNote,
          maxContext:
            settings.maxContextType === 'custom'
              ? settings.maxContextValue
              : settings.maxContextType === 'profile'
              ? 'preset'
              : 'active',
          includeNames: !!selected_group,
        };

        if (!avatar) {
          buildPromptOptions.messageIndexesBetween = { start: -1, end: -1 };
        } else {
          switch (settings.contextToSend.messages.type) {
            case 'none':
              buildPromptOptions.messageIndexesBetween = { start: -1, end: -1 };
              break;
            case 'first':
              buildPromptOptions.messageIndexesBetween = { start: 0, end: settings.contextToSend.messages.first ?? 10 };
              break;
            case 'last': {
              const lastCount = settings.contextToSend.messages.last ?? 10;
              const chatLength = globalContext.chat?.length ?? 0;
              buildPromptOptions.messageIndexesBetween = {
                end: Math.max(0, chatLength - 1),
                start: Math.max(0, chatLength - lastCount),
              };
              break;
            }
            case 'range':
              if (settings.contextToSend.messages.range)
                buildPromptOptions.messageIndexesBetween = settings.contextToSend.messages.range;
              break;
          }
        }

        const promptSettings = structuredClone(settings.prompts);
        if (!settings.contextToSend.stDescription) delete (promptSettings as any).stDescription;
        if (!settings.contextToSend.worldInfo) delete (promptSettings as any).currentLorebooks;

        const continueFromPayload = continueFrom
          ? { entry: continueFrom.entry, mode: continueFrom.mode }
          : undefined;

        const resultingActions = await runWorldInfoRecommendation({
          profileId: settings.profileId,
          userPrompt: userPrompt,
          buildPromptOptions,
          entries: suggestedActions,
          promptSettings,
          mainContextList: settings.mainContextTemplatePresets[settings.mainContextTemplatePreset].prompts
            .filter((p) => p.enabled)
            .map((p) => ({ promptName: p.promptName, role: p.role })),
          maxResponseToken: settings.maxResponseToken,
          continueFrom: continueFromPayload,
        });

        if (resultingActions.length > 0) {
          if (continueFrom) {
            // If we were revising, replace the old entry with the new one
            setSuggestedActions((prevActions) =>
              prevActions.map((action) => (action.uid === continueFrom.entry.uid ? resultingActions[0] : action)),
            );
            st_echo('success', `Revised action.`);
          } else {
            // Otherwise, add the new actions to the list
            setSuggestedActions((prevActions) => [...prevActions, ...resultingActions]);
            st_echo('success', `Added ${resultingActions.length} new actions.`);
          }
        } else {
          st_echo('warning', 'No results from AI');
        }
      } catch (error: any) {
        console.error(error);
        st_echo('error', error instanceof Error ? error.message : String(error));
      } finally {
        setIsGenerating(false);
      }
    },
    [settings, suggestedActions],
  );

  // --- UI Action Handlers ---
  const handleReviseAction = useCallback(
    (entry: NEntry, prompt: string) => {
      handleGeneration({ entry, prompt, mode: 'revise' });
    },
    [handleGeneration],
  );

  const handleDismissAction = useCallback((uid: number) => {
    setSuggestedActions((prevActions) => prevActions.filter((action) => action.uid !== uid));
  }, []);

  const handlePublishAction = useCallback(
    async (entry: NEntry) => {
      const {
        chat,
        addOneMessage,
        // @ts-ignore
        saveChat,
        eventSource,
        // @ts-ignore
        event_types,
        // @ts-ignore
      } = SillyTavern.getContext();

      if (
        !chat ||
        !addOneMessage ||
        !saveChat ||
        !eventSource ||
        !event_types
      ) {
        console.error('[Narrator] Missing required context functions for publishing.');
        return;
      }

      const message = {
        name: 'Narrator',
        is_user: false,
        is_system: false,
        send_date: Date.now(),
        mes: entry.content.trim(),
        force_avatar: comment_avatar,
        extra: {
          type: 'narrator',
          gen_id: Date.now(),
          api: 'manual',
          model: 'SillyTavern-Narrator',
        },
      };

      // Follow the sequence from the example for adding to the end
      chat.push(message);
      await eventSource.emit(event_types.MESSAGE_SENT, chat.length - 1);
      addOneMessage(message);
      await eventSource.emit(event_types.USER_MESSAGE_RENDERED, chat.length - 1);
      await saveChat();

      onClose(); // Close the popup after publishing
    },
    [onClose],
  );

  const handleReset = () => {
    setSuggestedActions([]);
  };

  return (
    <>
      <div id="narratorPopup">
        <h2>Narrator Entry Generator</h2>
        <div className="container">
          {/* Left Column */}
          <div className="column">
            <div className="card">
              <h3>Connection Profile</h3>
              <STConnectionProfileSelect
                initialSelectedProfileId={settings.profileId}
                // @ts-ignore
                onChange={(profile) => updateSetting('profileId', profile?.id)}
              />
            </div>

            <div className="card">
              <h3>Context to Send</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="checkbox_label">
                  <input
                    type="checkbox"
                    checked={settings.contextToSend.stDescription}
                    onChange={(e) => updateContextToSend('stDescription', e.target.checked)}
                  />
                  Description of SillyTavern
                </label>
                {/* Message Options */}
                {avatarKey != '_global' && (
                  <div className="message-options">
                    <h4>Messages to Include</h4>
                    <select
                      className="text_pole"
                      value={settings.contextToSend.messages.type}
                      onChange={(e) =>
                        updateContextToSend('messages', {
                          ...settings.contextToSend.messages,
                          type: e.target.value as any,
                        })
                      }
                    >
                      <option value="none">None</option>
                      <option value="all">All Messages</option>
                      <option value="first">First X Messages</option>
                      <option value="last">Last X Messages</option>
                      <option value="range">Range</option>
                    </select>

                    {settings.contextToSend.messages.type === 'first' && (
                      <div style={{ marginTop: '10px' }}>
                        <label>
                          First{' '}
                          <input
                            type="number"
                            className="text_pole small message-input"
                            min="1"
                            value={settings.contextToSend.messages.first ?? 10}
                            onChange={(e) =>
                              updateContextToSend('messages', {
                                ...settings.contextToSend.messages,
                                first: parseInt(e.target.value) || 10,
                              })
                            }
                          />{' '}
                          Messages
                        </label>
                      </div>
                    )}
                    {settings.contextToSend.messages.type === 'last' && (
                      <div style={{ marginTop: '10px' }}>
                        <label>
                          Last{' '}
                          <input
                            type="number"
                            className="text_pole small message-input"
                            min="1"
                            value={settings.contextToSend.messages.last ?? 10}
                            onChange={(e) =>
                              updateContextToSend('messages', {
                                ...settings.contextToSend.messages,
                                last: parseInt(e.target.value) || 10,
                              })
                            }
                          />{' '}
                          Messages
                        </label>
                      </div>
                    )}
                    {settings.contextToSend.messages.type === 'range' && (
                      <div style={{ marginTop: '10px' }}>
                        <label>
                          Range:{' '}
                          <input
                            type="number"
                            className="text_pole small message-input"
                            min="0"
                            placeholder="Start"
                            value={settings.contextToSend.messages.range?.start ?? 0}
                            onChange={(e) =>
                              updateContextToSend('messages', {
                                ...settings.contextToSend.messages,
                                range: {
                                  ...settings.contextToSend.messages.range!,
                                  start: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                          />{' '}
                          to{' '}
                          <input
                            type="number"
                            className="text_pole small message-input"
                            min="1"
                            placeholder="End"
                            value={settings.contextToSend.messages.range?.end ?? 10}
                            onChange={(e) =>
                              updateContextToSend('messages', {
                                ...settings.contextToSend.messages,
                                range: {
                                  ...settings.contextToSend.messages.range!,
                                  end: parseInt(e.target.value) || 10,
                                },
                              })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <label className="checkbox_label">
                  <input
                    type="checkbox"
                    checked={settings.contextToSend.charCard}
                    onChange={(e) => updateContextToSend('charCard', e.target.checked)}
                  />
                  Char Card
                </label>
                <label className="checkbox_label">
                  <input
                    type="checkbox"
                    checked={settings.contextToSend.worldInfo}
                    onChange={(e) => updateContextToSend('worldInfo', e.target.checked)}
                  />
                  World Info
                </label>
                
                <label className="checkbox_label">
                  <input
                    type="checkbox"
                    checked={settings.contextToSend.authorNote}
                    onChange={(e) => updateContextToSend('authorNote', e.target.checked)}
                  />{' '}
                  Author Note
                </label>
              </div>
            </div>

            <div className="card">
              <label>
                Max Context
                <select
                  className="text_pole"
                  title="Select Max Context Type"
                  value={settings.maxContextType}
                  onChange={(e) => updateSetting('maxContextType', e.target.value as any)}
                >
                  <option value="profile">Use profile preset</option>
                  <option value="sampler">Use active preset in sampler settings</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              {settings.maxContextType === 'custom' && (
                <label style={{ marginTop: '10px' }}>
                  <input
                    type="number"
                    className="text_pole"
                    min="1"
                    step="1"
                    placeholder="Enter max tokens"
                    value={settings.maxContextValue}
                    onChange={(e) => updateSetting('maxContextValue', parseInt(e.target.value) || 2048)}
                  />
                </label>
              )}

              <label style={{ display: 'block', marginTop: '10px' }}>
                Max Response Tokens
                <input
                  type="number"
                  className="text_pole"
                  min="1"
                  step="1"
                  placeholder="Enter max response tokens"
                  value={settings.maxResponseToken}
                  onChange={(e) => updateSetting('maxResponseToken', parseInt(e.target.value) || 256)}
                />
              </label>
            </div>

            <div className="card">
              <h3>Your Prompt</h3>
              <STPresetSelect
                label="Prompt Preset"
                items={promptPresetItems}
                value={settings.promptPreset}
                readOnlyValues={['default']}
                onChange={(newValue) => updateSetting('promptPreset', newValue ?? 'default')}
                onItemsChange={(newItems) => {
                  const newPresets = newItems.reduce(
                    (acc, item) => {
                      acc[item.value] = settings.promptPresets[item.value] ?? { content: '' };
                      return acc;
                    },
                    {} as Record<string, { content: string }>,
                  );
                  updateSetting('promptPresets', newPresets);
                }}
                enableCreate
                enableRename
                enableDelete
              />
              <STTextarea
                value={settings.promptPresets[settings.promptPreset]?.content ?? ''}
                onChange={(e) => {
                  const newPresets = { ...settings.promptPresets };
                  if (newPresets[settings.promptPreset]) {
                    newPresets[settings.promptPreset].content = e.target.value;
                    updateSetting('promptPresets', newPresets);
                  }
                }}
                placeholder="e.g., 'Suggest entries for places {{user}} visited.'"
                rows={4}
                style={{ marginTop: '5px', width: '100%' }}
              />
              <STButton
                onClick={() => handleGeneration()}
                disabled={isGenerating}
                className="menu_button interactable"
                style={{ marginTop: '5px' }}
              >
                {isGenerating ? 'Generating...' : 'Send Prompt'}
              </STButton>
              <STButton onClick={onClose} className="menu_button interactable" style={{ marginTop: '5px' }}>
                Close
              </STButton>
            </div>
          </div>

          {/* Right Column */}
          <div className="wide-column">
            <div className="card">
              <h3>Narrator Suggestions</h3>
              <div className="actions">
                <STButton onClick={handleReset} disabled={isGenerating} className="menu_button interactable">
                  Clear All
                </STButton>
              </div>
              <div>
                {suggestedActions.length === 0 && <p>No suggestions yet. Send a prompt to get started!</p>}
                {suggestedActions.map((entry) => (
                  <SuggestedAction
                    key={entry.uid}
                    entry={entry}
                    onRevise={handleReviseAction}
                    onDismiss={handleDismissAction}
                    onPublish={handlePublishAction}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};