import { mindstaffDisplayText } from '@/employee';
import IconEdit from '@/assets/icons/edit.svg?react';

import {
  CHAT_HEADER_CLASS,
  CHAT_HEADER_TITLE_NAME_CLASS,
  CHAT_HEADER_TITLE_STACK_CLASS,
} from '../chatPageStyles';
import type { UseChatSession } from '../useChatSession';

export default function ChatHeader({ chat }: { chat: UseChatSession }) {
  const { currentSession, openRename } = chat;
  const name = currentSession?.title ? mindstaffDisplayText(currentSession.title) : currentSession?.id || '新对话';

  return (
    <div className={CHAT_HEADER_CLASS}>
      <div className={CHAT_HEADER_TITLE_STACK_CLASS}>
        <span className="flex min-w-0 items-center gap-[4px]">
          <span className={CHAT_HEADER_TITLE_NAME_CLASS}>{name}</span>
          {currentSession && (
            <button
              type="button"
              aria-label="重命名会话"
              onClick={() => openRename(currentSession)}
              className="inline-grid size-[14px] shrink-0 place-items-center text-[#858b9c] transition-colors hover:text-[#18181a]"
            >
              <IconEdit className="size-[14px]!" />
            </button>
          )}
        </span>
      </div>

    </div>
  );
}
