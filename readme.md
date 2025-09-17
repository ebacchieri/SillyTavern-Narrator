# SillyTavern Narrator

## Overview

A [SillyTavern](https://docs.sillytavern.app/) extension that acts as a dynamic Dungeon Master or Narrator's assistant. It uses a configured LLM to generate a list of creative, narrative actions that can happen next in your story, helping you overcome writer's block and drive the plot forward in interesting ways.

<img width="1699" height="1102" alt="image" src="https://github.com/user-attachments/assets/dfc9723b-92d2-47de-88af-8c1bee3291c4" />

Instead of just generating lore, this extension provides a set of six distinct, paragraph-long scenarios suitable for a 1d6 dice roll, giving you a range of creative options to choose from.

## Features

-   **Dynamic Story Suggestions**: Generates 6 detailed narrative actions based on the current chat context and your prompt.
-   **Narrator/DM Perspective**: The AI acts as a third-person narrator, proposing events and scenarios that involve the characters, the environment, and the wider world.
-   **Interactive UI**: Each suggestion comes with a set of controls:
    -   **Publish**: Sends the action directly to the chat as a narrator message and closes the popup.
    -   **Revise**: Send instructions to the AI to modify a specific suggestion.
    -   **Copy**: Copies the action's text to your clipboard.
    -   **Dismiss**: Removes the suggestion from the list.
-   **Easy Access**: Open the Narrator UI from two places:
    -   The main extensions menu (click the Wand icon 🪄, then "Narrator").
-   **Highly Configurable**: Almost every aspect of the AI's behavior can be configured, including:
    -   The system prompts that define the Narrator's role and output format.
    -   The context sent to the AI (chat history, character cards, etc.).
    -   The connection profile and generation settings to use.

## How to Use

1.  **Open the Narrator UI**:
    -   Click the **Wand icon (🪄)** in the left of message box, then click **Narrator** from the extensions list.
2.  **Configure Settings**: In the left-hand panel, select the AI connection profile you want to use and choose what context (chat history, character details, etc.) should be sent.
3.  **Write a Prompt**: In the "Your Prompt" section, tell the Narrator what you want ideas for (e.g., *"What happens when we enter the spooky castle?"*).
4.  **Generate Suggestions**: Click the **Send Prompt** button.
5.  **Interact with Actions**: The right-hand panel will populate with six narrative suggestions. Use the **Publish**, **Revise**, **Copy**, or **Dismiss** buttons on each suggestion to continue your story.

## Configuration

This extension is designed to be highly flexible. You can customize the core prompts that guide the AI by going to the main SillyTavern settings, navigating to the **Extensions** tab, and finding the **Narrator** section. Here, you can edit the templates for the Narrator's role, the XML format rules, and more to tailor the generated results to your specific needs.

<img width="1719" height="1016" alt="image" src="https://github.com/user-attachments/assets/d886b7a8-78e9-459d-b8ea-3afd2bb0e6d1" />

## Acknowledgements

This extension is heavily inspired by and is a significant rework of the [SillyTavern-WorldInfo-Recommender](https://github.com/bmen25124/SillyTavern-WorldInfo-Recommender) by bmen25124. Many of the core ideas and initial code structure were adapted from that project.

