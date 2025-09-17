import React from 'react';
import ReactDOM from 'react-dom/client';
import { extensionName, initializeSettings } from './settings.js';
import { NarratorSettings } from './components/Settings.js';
import { st_echo } from 'sillytavern-utils-lib/config';
import { PopupManager } from './components/PopupManager.js';

const globalContext = SillyTavern.getContext();

export async function init() {
  // --- Settings Panel Rendering ---
  const settingsHtml: string = await globalContext.renderExtensionTemplateAsync(
    `third-party/${extensionName}`,
    'templates/settings',
  );
  document.querySelector('#extensions_settings')!.insertAdjacentHTML('beforeend', settingsHtml);

  const settingsRootElement = document.createElement('div');
  const settingContainer = document.querySelector(
    '.narrator_settings .inline-drawer-content',
  ) as HTMLElement;
  if (settingContainer) {
    settingContainer.prepend(settingsRootElement);
    const settingsRoot = ReactDOM.createRoot(settingsRootElement);
    settingsRoot.render(
      <React.StrictMode>
        <NarratorSettings />
      </React.StrictMode>,
    );
  }

  // --- Main Popup Rendering ---
  const popupManagerContainer = document.createElement('div');
  document.body.appendChild(popupManagerContainer);
  const popupManagerRoot = ReactDOM.createRoot(popupManagerContainer);
  popupManagerRoot.render(
    <React.StrictMode>
      <PopupManager />
    </React.StrictMode>,
  );

  // --- Extension Menu Button ---
  // @ts-ignore
  jQuery(() => {
    const buttonId = 'narrator-menu-button';
    const buttonHtml = `
        <div id="${buttonId}" class="list-group-item flex-container flexGap5" title="Open Narrator to generate lorebook entries.">
            <div class="fa-solid fa-book-open extensionsMenuExtensionButton"></div>
            <span>Narrator</span>
        </div>`;

    // Append to the main extensions menu container
    $('#extensionsMenu').append(buttonHtml);

    $(`#${buttonId}`).on('click', () => {
      // @ts-ignore
      if (window.opennarratorPopup) {
        // @ts-ignore
        window.opennarratorPopup();
      }
    });

  });
}

function importCheck(): boolean {
  // (Your import check logic is fine)
  if (!globalContext.ConnectionManagerRequestService) return false;
  if (!globalContext.getCharacterCardFields) return false;
  if (!globalContext.getWorldInfoPrompt) return false;
  if (!globalContext.reloadWorldInfoEditor) return false;
  return true;
}

if (!importCheck()) {
  st_echo('error', `[${extensionName}] Make sure ST is updated.`);
} else {
  initializeSettings().then(() => {
    init();
  });
}
