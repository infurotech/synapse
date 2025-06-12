import React from 'react';
import {
  IonIcon,
  IonButton,
} from '@ionic/react';
import { chevronForwardOutline } from 'ionicons/icons';
import { useConversation } from '../contexts/ConversationContext';
import './RecentConversations.css';

interface RecentConversationsProps {
  onConversationSelect: (conversationId: string) => void;
  maxItems?: number;
}

const RecentConversations: React.FC<RecentConversationsProps> = ({
  onConversationSelect,
  maxItems = 5
}) => {
  const { conversations } = useConversation();
  
  // Display only the specified number of most recent conversations
  const recentConversations = conversations.slice(0, maxItems);
  
  if (recentConversations.length === 0) {
    return (
      <div className="no-conversations">
        <p>No recent conversations</p>
      </div>
    );
  }
  
  return (
    <div className="recent-conversations">
      <div className="recent-conversations-header">
        <h3>Recent Conversations</h3>
        {conversations.length > maxItems && (
          <IonButton fill="clear" routerLink="/conversations" className="see-all-btn">
            See all
          </IonButton>
        )}
      </div>
      
      <div className="conversation-list">
        {recentConversations.map((conversation) => (
          <div 
            key={conversation.id} 
            className="conversation-item"
            onClick={() => onConversationSelect(conversation.id)}
          >
            <div className="conversation-content">
              <h4 className="conversation-title">{conversation.title}</h4>
              <p className="conversation-preview">{conversation.preview}</p>
            </div>
            <div className="conversation-meta">
              <span className="conversation-time">{conversation.time}</span>
              <IonIcon icon={chevronForwardOutline} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentConversations; 