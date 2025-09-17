import { buildPrompt, BuildPromptOptions, ExtensionSettingsManager, Message } from 'sillytavern-utils-lib';
import { ExtractedData } from 'sillytavern-utils-lib/types';
import { getFullXML, getPrefilledXML, parseXMLOwn } from './xml.js';
import { NEntry } from './types.js';
import { ExtensionSettings, MessageRole } from './settings.js';

// @ts-ignore
import { Handlebars } from '../../../../../lib.js';

export const globalContext = SillyTavern.getContext();


// @ts-ignore
const dumbSettings = new ExtensionSettingsManager<ExtensionSettings>('dumb', {}).getSettings();

export interface RunWorldInfoRecommendationParams {
  profileId: string;
  userPrompt: string;
  buildPromptOptions: BuildPromptOptions;
  entries: NEntry[];
  promptSettings: typeof dumbSettings.prompts;
  mainContextList: {
    promptName: string;
    role: MessageRole;
  }[];
  maxResponseToken: number;
  continueFrom?: { entry: NEntry; mode: 'continue' | 'revise' };
}

export async function runWorldInfoRecommendation({
  profileId,
  userPrompt,
  buildPromptOptions,
  entries,
  promptSettings,
  mainContextList,
  maxResponseToken,
  continueFrom,
}: RunWorldInfoRecommendationParams): Promise<NEntry[]> {
  if (!profileId) {
    throw new Error('No connection profile selected.');
  }
  const context = SillyTavern.getContext();
  const profile = context.extensionSettings.connectionManager?.profiles?.find((profile) => profile.id === profileId);
  if (!profile) {
    throw new Error(`Connection profile with ID "${profileId}" not found.`);
  }

  const selectedApi = profile.api ? globalContext.CONNECT_API_MAP[profile.api].selected : undefined;
  if (!selectedApi) {
    throw new Error(`Could not determine API for profile "${profile.name}".`);
  }

  const templateData: Record<string, any> = {};
  templateData['user'] = '{{user}}'; // ST going to replace this with the actual user name
  templateData['char'] = '{{char}}'; // ST going to replace this with the actual character name
  templateData['persona'] = '{{persona}}'; // ST going to replace this with the actual persona description

  const finalUserPrompt = userPrompt.trim();

  // If we are revising, the main userInstructions in the system prompt will be empty.
  // The actual instructions will be added as a separate user message later.
  if (continueFrom && continueFrom.mode === 'revise') {
    templateData['userInstructions'] = '';
  } else {
    templateData['userInstructions'] = Handlebars.compile(finalUserPrompt, { noEscape: true })(templateData);
  }

  templateData['suggestedActions'] = entries;

  const messages: Message[] = [];
  {
    for (const mainContext of mainContextList) {
      // Chat history is exception, since it is not a template
      if (mainContext.promptName === 'chatHistory') {
        messages.push(...(await buildPrompt(selectedApi, buildPromptOptions)).result);
        continue;
      }

      const prompt = promptSettings[mainContext.promptName];
      if (!prompt) {
        continue;
      }
      const message: Message = {
        role: mainContext.role,
        content: Handlebars.compile(prompt.content, { noEscape: true })(templateData),
      };
      message.content = globalContext.substituteParams(message.content);
      if (message.content) {
        messages.push(message);
      }
    }

    if (continueFrom) {
      if (continueFrom.mode === 'continue') {
        // Add the incomplete XML to prompt for completion.
        messages.push({
          role: 'assistant',
          content: getPrefilledXML(continueFrom.entry),
        });
      } else if (continueFrom.mode === 'revise') {
        // Add the full XML of the existing entry as an assistant message.
        messages.push({
          role: 'assistant',
          content: getFullXML(continueFrom.entry),
        });
        // Then, add the user's revision instructions as a new user message.
        if (finalUserPrompt) {
          messages.push({
            role: 'user',
            content: finalUserPrompt,
          });
        }
      }
    }
  }

  // console.log("Sending messages:", messages);

  const response = (await globalContext.ConnectionManagerRequestService.sendRequest(
    profileId,
    messages,
    maxResponseToken,
  )) as ExtractedData;

  // console.log("Received content:", response.content);

  const assistantMessageForContinue = messages.find((m) => m.role === 'assistant');
  let parsedEntries = parseXMLOwn(response.content, {
    // Only merge with previous content if we are in 'continue' mode.
    previousContent:
      continueFrom && continueFrom.mode === 'continue' ? assistantMessageForContinue?.content : undefined,
  });

  if (Object.keys(parsedEntries).length === 0) {
    return [];
  }

  // Set "key" and "comment" if missing, using the passed entriesGroupByWorldName
  parsedEntries.forEach((entry: NEntry) => {
    const existentWI = entries.find((e: NEntry) => e.uid === entry.uid);
    if (existentWI) {
      if (!entry.comment) {
        entry.comment = existentWI.comment;
      }
    }
    // Ensure comment is at least an empty string if somehow still missing
    if (entry.comment === null || entry.comment === undefined) {
      entry.comment = '';
    }
  });

  parsedEntries = continueFrom ? [parsedEntries[0]] : parsedEntries;

  return parsedEntries;
}

// Helper for slash command enum provider
export function provideConnectionProfiles() {
  const profiles = globalContext.extensionSettings?.connectionManager?.profiles ?? [];
  return profiles.map((p) => ({
    value: p.name ?? p.id,
    valueProvider: (value: string) => {
      return profiles.find((p) => p.name?.includes(value))?.name;
    },
  }));
}
