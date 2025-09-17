import { XMLParser } from 'fast-xml-parser';
import { NEntry } from './types.js';

const parser = new XMLParser();

function createRandomNumber(length: number): number {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface XmlParseOptions {
  previousContent?: string;
}

export function parseXMLOwn(xml: string, options: XmlParseOptions = {}): NEntry[] {
  let processedXml = xml;
  const { previousContent } = options;

  // Remove code blocks
  processedXml = processedXml.replace(/```xml/g, '').replace(/```/g, '');

  // Merge with previous content if exists
  if (previousContent) {
    processedXml = previousContent + processedXml.trimEnd();
  }

  // Ensure XML is complete by checking for imbalanced tags
  if (processedXml.includes('<action>') && !processedXml.includes('</action>')) {
    throw new Error('Incomplete XML: Missing </action> tag');
  }
  if (processedXml.includes('<description>') && !processedXml.includes('</description>')) {
    throw new Error('Incomplete XML: Missing </description> tag');
  }

  const actions: NEntry[] = [];
  try {
    const rawResponse = parser.parse(processedXml);

    if (!rawResponse.actions) {
      return actions;
    }

    const parsedActions = rawResponse.actions.action?.description
      ? [rawResponse.actions.action]
      : rawResponse.actions.action;

    if (!parsedActions) {
      return actions;
    }

    for (const action of parsedActions) {
      if (action.description) {
        const content = Array.isArray(action.description)
          ? action.description.join('\n\n')
          : action.description;

        actions.push({
          uid: createRandomNumber(6),
          key: [], // No triggers in the new format
          content: content,
          comment: action.title ?? '', // Use title as comment
          disable: false,
          keysecondary: [],
        });
      }
    }

    return actions;
  } catch (error: any) {
    console.error(error);
    throw new Error('Model response is not valid XML');
  }
}

export function getPrefilledXML(entry: NEntry): string {
  return `
<actions>
  <action>
    <title>${entry.comment}</title>
    <description>${entry.content}`;
}

export function getFullXML(entry: NEntry): string {
  return `
<actions>
  <action>
    <title>${entry.comment}</title>
    <description>${entry.content}</description>
  </action>
</actions>`;
}
