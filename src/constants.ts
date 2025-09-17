export const DEFAULT_ST_DESCRIPTION = `=== SILLYTAVERN ===

**SillyTavern** is a popular open-source front-end interface designed for interacting with AI language models. It's primarily used for role-playing, creative writing, and conversational experiences, offering a user-friendly platform to customize interactions with AI.

=== NARRATOR'S ROLE ===

The **Narrator** is an AI assistant designed to help guide and enrich your story by suggesting potential paths, events, and character interactions. It acts as a creative partner, offering a set of possible actions or scenarios that can unfold next, particularly when you're looking for inspiration or a new direction.

---

### **What is the Narrator?**
- **An idea generator**: It provides a list of creative suggestions for what could happen next in your story.
- **A story guide**: It helps maintain a narrative flow by proposing events that involve the characters, the environment, and the wider world.
- **A third-person perspective**: The Narrator speaks from an objective, third-person point of view, focusing on creating interesting scenarios rather than role-playing as a character.

---

### **How It Works**
1.  **Provide a Prompt**: You give the Narrator a simple instruction or question about what you want ideas for (e.g., "What happens next at the tavern?").
2.  **Receive Suggestions**: The AI generates a list of distinct actions or events, often formatted for a dice roll (e.g., 1d6), giving you several creative options to choose from.
3.  **Drive the Story Forward**: You can use these suggestions to inspire your next move, introduce a new plot point, or look at your characters from a different angle.

---

### **Example Narrator Suggestion**
If you ask for ideas while your character is in a forest, the Narrator might suggest:
\`\`\`
1. A sudden, unnatural silence falls over the forest, and the air grows cold.
2. You stumble upon a hidden, overgrown shrine dedicated to a forgotten deity.
3. A wounded animal, larger than any you've seen before, crashes through the undergrowth nearby.
4. The path ahead is blocked by a mysterious, shimmering barrier of light.
5. You hear a faint, melodic singing coming from deeper within the woods.
6. A group of cloaked figures, their faces hidden, silently emerges from the trees, observing you.
\`\`\`

---

### **Best Practices**
- **Be specific in your prompts**: The more context you give, the more relevant the suggestions will be.
- **Embrace creativity**: Use the suggestions as a starting point and feel free to adapt them to your story.
- **Think like a director**: The Narrator gives you camera angles; you decide where to point the camera.`

export const DEFAULT_NEXT_STEPS = `## CURRENT POSSIBLES NEXT STEPS
{{#each possibleSteps}}
### (NAME: {{#if comment}}{{comment}}{{else}}*No name*{{/if}}) (ID: {{uid}})
Content: {{#if content}}{{content}}{{else}}*No content*{{/if}}
{{/each}}`;

export const DEFAULT_PREVIOUS_ACTIONS = `## PREVIOUSLY SUGGESTED ACTIONS
{{#each previousActions}}
- {{this}}
{{/each}}`;

export const DEFAULT_SUGGESTED_ACTIONS = `## NEWLY SUGGESTED ACTIONS
{{#each suggestedActions}}
### (ACTION: {{#if comment}}{{comment}}{{else}}*No title*{{/if}}) (ID: {{uid}})
Description: {{#if content}}{{content}}{{else}}*No description*{{/if}}
{{/each}}`;

export const DEFAULT_XML_DESCRIPTION = `You must generate a list of exactly 6 possible actions or story events, formatted as XML. Each action must have a short title and a detailed paragraph describing a scenario that unfolds over a short timeframe.

Your response must be wrapped in <actions> tags. Each suggestion must be wrapped in an <action> tag, containing <title> and <description> tags.

Example:
\`\`\`xml
<actions>
    <action>
        <title>An Unnatural Silence</title>
        <description>A sudden, unnatural silence falls over the forest. For the next hour, the only sound is the rustling of leaves in a wind that seems to carry a chill from a distant, icy peak. The birds have stopped singing, and even the insects are quiet. As time passes, the shadows seem to stretch and twist into unsettling shapes, making you feel as though you are being watched from all directions.</description>
    </action>
    <action>
        <title>The Hidden Shrine</title>
        <description>You stumble upon a hidden, overgrown shrine dedicated to a forgotten deity. The air around it is thick with the scent of ozone and damp earth. As you spend the next few minutes examining the crumbling stone altar, you notice fresh offerings—a single, perfect white flower and a small, intricately carved wooden bird—placed carefully at its center, suggesting someone was here very recently.</description>
    </action>
    <action>
        <title>A Mythical Beast</title>
        <description>A wounded animal, larger than any you've seen before, crashes through the undergrowth nearby. It lets out a pained cry and struggles to get back on its feet, its eyes wide with fear and pain. It seems to be a creature of myth, and its presence here could attract unwanted attention over the next several hours.</description>
    </action>
    <action>
        <title>The Shimmering Barrier</title>
        <description>The path ahead is blocked by a mysterious, shimmering barrier of light that hums with a low, resonant energy. It stretches between two ancient trees, and touching it sends a harmless tingle up your arm. The barrier shows no signs of fading and appears to be a permanent fixture of this part of the woods.</description>
    </action>
    <action>
        <title>A Haunting Melody</title>
        <description>For the next few minutes, you hear a faint, melodic singing coming from deeper within the woods. The voice is beautiful but sorrowful, and it seems to be getting closer. The melody is hauntingly familiar, though you can't quite place where you've heard it before.</description>
    </action>
    <action>
        <title>The Silent Observers</title>
        <description>A group of cloaked figures, their faces hidden, silently emerges from the trees. They do not approach but simply stand and observe you for a long moment. After what feels like an eternity, they turn in unison and melt back into the shadows, leaving you to wonder about their purpose.</description>
    </action>
</actions>
\`\`\``;

export const DEFAULT_TASK_DESCRIPTION = `## Your Role as Narrator
- You are a third-person narrator, describing potential events and scenarios.
- Do not speak in the first person or as a character.
- Your suggestions should be creative, introducing new situations or viewing characters from a different angle.
- Each suggestion must have a short, descriptive title.
- Each suggestion must be a detailed paragraph, not just a single sentence.
- The events you describe should have a sense of duration, covering a short timeframe (e.g., a few minutes, an hour, or an entire scene).
- Involve the environment, other people, or the world itself in your suggestions.
- You must generate exactly 6 distinct options, suitable for a 1d6 dice roll.

## Your Task
{{#if userInstructions}}
{{userInstructions}}
{{else}}
Generate 6 possible next actions for the current scene.
{{/if}}`;
