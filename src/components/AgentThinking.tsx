import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { 
  bulbOutline, 
  cogOutline, 
  checkmarkCircleOutline, 
  chevronUpOutline, 
  chevronDownOutline,
  sparklesOutline 
} from 'ionicons/icons';
import { AgentStep } from '../agent/AgentService';

interface AgentThinkingProps {
  steps: AgentStep[];
  isProcessing: boolean;
  isCollapsible?: boolean;
}

interface ThinkingStepDisplayProps {
  step: AgentStep;
  index: number;
  isActive: boolean;
}

const ThinkingStepDisplay: React.FC<ThinkingStepDisplayProps> = ({ step, index, isActive }) => {
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'thought':
        return bulbOutline;
      case 'tool_call':
        return cogOutline;
      case 'tool_result':
        return checkmarkCircleOutline;
      default:
        return sparklesOutline;
    }
  };

  const getStepTitle = (type: string, toolName?: string) => {
    switch (type) {
      case 'thought':
        return 'Thinking';
      case 'tool_call':
        return toolName ? `Using ${toolName}` : 'Executing tool';
      case 'tool_result':
        return toolName ? `${toolName} completed` : 'Tool completed';
      default:
        return 'Processing';
    }
  };

  const formatContent = (content: string, type: string) => {
    if (type === 'tool_call' && step.toolArgs) {
      return `${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`;
    }
    return content.length > 120 ? `${content.substring(0, 120)}...` : content;
  };

  const formatToolArgs = (args: Record<string, unknown>) => {
    const simplified: Record<string, string> = {};
    Object.entries(args).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 30) {
        simplified[key] = `${value.substring(0, 30)}...`;
      } else {
        simplified[key] = String(value);
      }
    });
    return JSON.stringify(simplified, null, 2);
  };

  return (
    <div 
      className={`thinking-step ${isActive ? 'active' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={`thinking-step-icon ${step.type}`}>
        <IonIcon icon={getStepIcon(step.type)} />
      </div>
      <div className="thinking-step-content">
        <div className="thinking-step-title">
          {getStepTitle(step.type, step.toolName)}
        </div>
        <div className="thinking-step-description">
          {formatContent(step.content, step.type)}
        </div>
        {step.type === 'tool_call' && step.toolArgs && (
          <div className="tool-args-preview">
            {formatToolArgs(step.toolArgs)}
          </div>
        )}
      </div>
    </div>
  );
};

const AgentThinking: React.FC<AgentThinkingProps> = ({ 
  steps, 
  isProcessing, 
  isCollapsible = true 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<AgentStep[]>([]);

  // Animate steps appearing one by one
  useEffect(() => {
    if (steps.length === 0) {
      setVisibleSteps([]);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleSteps(steps);
    }, 100);

    return () => clearTimeout(timer);
  }, [steps]);

  // Don't render if no steps
  if (steps.length === 0 && !isProcessing) {
    return null;
  }

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`agent-thinking-panel ${isCollapsed ? 'thinking-collapsed' : ''}`}>
      <div className="agent-thinking-header">
        <div className="thinking-icon">
          <IonIcon icon={sparklesOutline} />
        </div>
        <h4 className="thinking-title">
          {isProcessing ? 'AI is thinking...' : `Thought process (${steps.length} steps)`}
        </h4>
        {isCollapsible && steps.length > 0 && (
          <button 
            className="thinking-collapse-button"
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? 'Expand thinking' : 'Collapse thinking'}
          >
            <IonIcon icon={isCollapsed ? chevronDownOutline : chevronUpOutline} />
          </button>
        )}
      </div>

      <div className="thinking-steps">
        {visibleSteps.map((step, index) => (
          <ThinkingStepDisplay
            key={step.id}
            step={step}
            index={index}
            isActive={true}
          />
        ))}
        
        {isProcessing && (
          <div className="thinking-step loading active">
            <div className="thinking-step-icon thought">
              <IonIcon icon={bulbOutline} />
            </div>
            <div className="thinking-step-content">
              <div className="thinking-step-title">Processing</div>
              <div className="thinking-step-description">
                Analyzing your request and determining the best approach...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentThinking; 