import React from 'react';
import { IonContent, IonPopover, IonIcon } from '@ionic/react';
import { chevronForwardOutline } from 'ionicons/icons';
import { useConversation, Conversation } from '../contexts/ConversationContext';
import './RecentConversations.css';
import '../pages/Dashboard.css';

interface RecentConversationsProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  onConversationSelect: (conversationId: string) => void;
}

const RecentConversations: React.FC<RecentConversationsProps> = ({
  isOpen,
  onDidDismiss,
  onConversationSelect,
}) => {
  const { conversations } = useConversation();

  return (
    <IonPopover
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      className="history-popover"
      trigger="history-trigger"
    >
      <IonContent className="history-popover-content">
        <div className="history-popover-header">
          <h3>Recent Conversations</h3>
        </div>
        <div className="history-conversation-list">
          {conversations.map((conversation: Conversation) => (
            <div
              key={conversation.id}
              className="history-conversation-item"
              onClick={() => onConversationSelect(conversation.id)}
            >
              <div className="history-conversation-content">
                <h4 className="history-conversation-title">{conversation.title}</h4>
                <p className="history-conversation-preview">{conversation.preview}</p>
              </div>
              <div className="history-conversation-meta">
                <span className="history-conversation-time">{conversation.time}</span>
                <IonIcon icon={chevronForwardOutline} />
              </div>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPopover>
  );
};

export default RecentConversations;