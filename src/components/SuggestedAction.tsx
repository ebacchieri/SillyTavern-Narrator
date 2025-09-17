import { FC, useMemo, useState } from 'react';
import { STButton, STTextarea } from 'sillytavern-utils-lib/components';
import { NEntry } from '../types.js';

export interface SuggestedActionProps {
  entry: NEntry;
  onRevise: (entry: NEntry, prompt: string) => void;
  onDismiss: (uid: number) => void;
  onPublish: (entry: NEntry) => void;
}

export const SuggestedAction: FC<SuggestedActionProps> = ({ entry, onRevise, onDismiss, onPublish }) => {
  const [isRevising, setIsRevising] = useState(false);
  const [revisePrompt, setRevisePrompt] = useState('');

  const formattedContent = useMemo(() => {
    // @ts-ignore
    const { messageFormatting } = SillyTavern.getContext();
    if (messageFormatting) {
      // Format the content as if it were a system message from the Narrator
      return messageFormatting(entry.content, 'Narrator', true, false, -1);
    }
    // Fallback just in case
    return entry.content.replace(/\n/g, '<br />');
  }, [entry.content]);

  const handleReviseClick = async () => {
    setIsRevising(true);
    await onRevise(entry, revisePrompt);
    setIsRevising(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(entry.content);
    // @ts-ignore
    SillyTavern.getContext().st_echo('success', 'Copied to clipboard!');
  };

  return (
    <div className="entry">
      <div className="menu">
        <STButton onClick={() => onPublish(entry)} className="menu_button interactable publish" title="Send this action to the chat.">
          Publish
        </STButton>
        <STButton
          onClick={handleReviseClick}
          disabled={isRevising}
          className="menu_button interactable revise"
          title="Request changes to this entry. Provide instructions in the textbox below."
        >
          {isRevising ? '...' : 'Revise'}
        </STButton>
        <STButton onClick={handleCopyToClipboard} className="menu_button interactable add" title="Copy the action text to your clipboard.">
          Copy
        </STButton>
        <STButton onClick={() => onDismiss(entry.uid)} className="menu_button interactable remove">
          Dismiss
        </STButton>
      </div>
      <h4 className="comment">{entry.comment}</h4>
      <div className="content" dangerouslySetInnerHTML={{ __html: formattedContent }} />
      <div className="continue-prompt-section" style={{ marginTop: '10px' }}>
        <STTextarea
          value={revisePrompt}
          onChange={(e) => setRevisePrompt(e.target.value)}
          placeholder="Optional instructions to revise this entry. Then press 'Revise'."
          rows={2}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
