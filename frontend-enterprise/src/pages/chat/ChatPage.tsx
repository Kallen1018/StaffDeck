import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import AppSidebar from '@/components/AppSidebar';
import AppTopHeader from '@/components/AppTopHeader';
import { getEnterpriseAuthSession, isEnterpriseAdmin } from '@/auth';
import { SidebarProvider } from '@/components/ui/sidebar';
import { EnterpriseRoute } from '@/enums/routes';
import { cn } from '@/lib/utils';

import { CHAT_MAIN_CLASS } from './chatPageStyles';
import { sessionHasUnreadReply } from './chatHelpers';
import { useChatSession } from './useChatSession';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import Composer from './components/Composer';
import ChatDialogs from './components/ChatDialogs';

export default function ChatPage() {
  const chat = useChatSession();
  const navigate = useNavigate();
  const auth = getEnterpriseAuthSession();

  return (
    <SidebarProvider
      open={!chat.sidebarCollapsed}
      onOpenChange={(open) => {
        if (open === chat.sidebarCollapsed) chat.toggleSidebar();
      }}
      style={
        {
          '--sidebar-width': '220px',
          '--sidebar-width-icon': '72px',
        } as CSSProperties
      }
      className="app-shell workspace-shell flex-col bg-[#fcfcfc] text-[#18181a]"
    >
      <AppTopHeader
        isAdmin={isEnterpriseAdmin(auth?.user)}
        activeApp="chat"
        onNavigate={navigate}
        onOpenChat={() => navigate(EnterpriseRoute.Gallery)}
        onOpenManagement={chat.openAdmin}
        onLogout={chat.logout}
        userName={auth?.user.username}
      />
      <div className="flex min-h-0 min-w-0 flex-1">
        <AppSidebar
          variant="chat"
          sessions={chat.visibleSidebarSessions}
          sessionsLoading={chat.sessionsLoading}
          agents={chat.agents}
          activeSessionId={chat.sessionId}
          sessionFilter={chat.sessionAgentFilter}
          onSessionFilterChange={chat.setSessionAgentFilter}
          sessionFilterOptions={chat.sessionFilterOptions}
          isSessionUnread={(session) => sessionHasUnreadReply(session, chat.sessionReadTimes, chat.sessionId)}
          onOpenSession={chat.openSession}
          onNewConversation={() => {
            const selectedAgent = chat.sessionAgentFilter === 'all'
              ? chat.displayedAgent
              : chat.agents.find((agent) => agent.id === chat.sessionAgentFilter);
            if (selectedAgent) chat.openDraftForAgent(selectedAgent.id);
            else chat.openGallery();
          }}
          onOpenGallery={chat.openGallery}
          handoffCount={chat.handoffs.length}
          onOpenHandoffs={chat.openHandoffInbox}
          onRenameSession={chat.openRename}
          onDeleteSession={chat.requestDelete}
        />
        <main className={cn(CHAT_MAIN_CLASS, 'flex-1')}>
          <ChatHeader chat={chat} />
          <MessageList chat={chat} />
          <Composer chat={chat} />
        </main>
      </div>
      <ChatDialogs chat={chat} />
    </SidebarProvider>
  );
}
