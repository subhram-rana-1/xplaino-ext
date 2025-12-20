// src/content/components/SidePanel/SummaryView.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Mic, ArrowUp, Trash2, Plus, Square } from 'lucide-react';
import { useAtom } from 'jotai';
import ReactMarkdown from 'react-markdown';
import styles from './SummaryView.module.css';
import { SummariseService } from '@/api-services/SummariseService';
import { AskService, ChatMessage } from '@/api-services/AskService';
import { extractAndStorePageContent, getStoredPageContent } from '@/content/utils/pageContentExtractor';
import { OnHoverMessage } from '../OnHoverMessage/OnHoverMessage';
import {
  pageReadingStateAtom,
  summariseStateAtom,
  askingStateAtom,
  summaryAtom,
  streamingTextAtom,
  askStreamingTextAtom,
  chatMessagesAtom,
  suggestedQuestionsAtom,
  summaryErrorAtom,
  hasContentAtom,
} from '@/store/summaryAtoms';

export interface SummaryViewProps {
  /** Whether to use Shadow DOM styling */
  useShadowDom?: boolean;
  /** Callback when login is required */
  onLoginRequired?: () => void;
}

// Reference link pattern: [[[ ref text ]]]
const REF_LINK_PATTERN = /\[\[\[\s*(.+?)\s*\]\]\]/g;

export const SummaryView: React.FC<SummaryViewProps> = ({
  useShadowDom = false,
  onLoginRequired,
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  
  // Jotai atoms for persistent state
  const [pageReadingState, setPageReadingState] = useAtom(pageReadingStateAtom);
  const [summariseState, setSummariseState] = useAtom(summariseStateAtom);
  const [askingState, setAskingState] = useAtom(askingStateAtom);
  const [summary, setSummary] = useAtom(summaryAtom);
  const [streamingText, setStreamingText] = useAtom(streamingTextAtom);
  const [askStreamingText, setAskStreamingText] = useAtom(askStreamingTextAtom);
  const [chatMessages, setChatMessages] = useAtom(chatMessagesAtom);
  const [suggestedQuestions, setSuggestedQuestions] = useAtom(suggestedQuestionsAtom);
  const [errorMessage, setErrorMessage] = useAtom(summaryErrorAtom);
  const [hasContent] = useAtom(hasContentAtom);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Animated dots state for "Reading page..."
  const [dotCount, setDotCount] = useState(1);

  // Hover state for tooltips
  const [hoveredIcon, setHoveredIcon] = useState<'mic' | 'send' | 'delete' | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs for tooltip positioning
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const getClassName = useCallback((baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    return styles[baseClass as keyof typeof styles] || baseClass;
  }, [useShadowDom]);

  // Handle tooltip hover
  useEffect(() => {
    if (hoveredIcon) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 1000);
    } else {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setShowTooltip(false);
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [hoveredIcon]);

  // Animate dots for loading state
  useEffect(() => {
    if (pageReadingState !== 'reading') return;

    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);

    return () => clearInterval(interval);
  }, [pageReadingState]);

  // Extract page content on mount (only if not already done)
  useEffect(() => {
    if (pageReadingState !== 'reading') return;

    const initPageContent = async () => {
      try {
        // Check if content already exists
        const existingContent = await getStoredPageContent();
        if (existingContent) {
          setPageReadingState('ready');
          return;
        }

        // Extract and store content
        const content = await extractAndStorePageContent();
        if (content) {
          setPageReadingState('ready');
        } else {
          setPageReadingState('error');
          setErrorMessage('Could not extract page content');
        }
      } catch (error) {
        console.error('[SummaryView] Error extracting page content:', error);
        setPageReadingState('error');
        setErrorMessage('Failed to read page content');
      }
    };

    initPageContent();
  }, [pageReadingState, setPageReadingState, setErrorMessage]);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [summary, streamingText, askStreamingText, chatMessages]);

  // Parse summary text and replace reference links with numbered buttons
  const parseReferences = (text: string): { parsedText: string; references: string[] } => {
    const references: string[] = [];
    let refIndex = 0;

    const parsedText = text.replace(REF_LINK_PATTERN, (_, refText) => {
      refIndex++;
      references.push(refText.trim());
      return `{{REF_${refIndex}}}`;
    });

    return { parsedText, references };
  };

  // Render summary with markdown and reference links
  const renderSummaryContent = (text: string) => {
    const { parsedText, references } = parseReferences(text);
    
    if (references.length === 0) {
      return (
        <ReactMarkdown
          components={{
            // Custom styling for markdown elements
            h1: ({ children }) => <h1 className={getClassName('markdownH1')}>{children}</h1>,
            h2: ({ children }) => <h2 className={getClassName('markdownH2')}>{children}</h2>,
            h3: ({ children }) => <h3 className={getClassName('markdownH3')}>{children}</h3>,
            p: ({ children }) => <p className={getClassName('markdownP')}>{children}</p>,
            ul: ({ children }) => <ul className={getClassName('markdownUl')}>{children}</ul>,
            ol: ({ children }) => <ol className={getClassName('markdownOl')}>{children}</ol>,
            li: ({ children }) => <li className={getClassName('markdownLi')}>{children}</li>,
            strong: ({ children }) => <strong className={getClassName('markdownStrong')}>{children}</strong>,
            em: ({ children }) => <em className={getClassName('markdownEm')}>{children}</em>,
            code: ({ children }) => <code className={getClassName('markdownCode')}>{children}</code>,
          }}
        >
          {text}
        </ReactMarkdown>
      );
    }

    // Handle references by splitting text and rendering each part
    const parts = parsedText.split(/({{REF_\d+}})/g);
    
    return (
      <>
        {parts.map((part, index) => {
          const match = part.match(/{{REF_(\d+)}}/);
          if (match) {
            const refNum = parseInt(match[1], 10);
            const refText = references[refNum - 1];
            return (
              <button
                key={index}
                className={getClassName('refButton')}
                title={refText}
                onClick={() => {
                  console.log('Reference clicked:', refText);
                }}
              >
                {refNum}
              </button>
            );
          }
          return (
            <ReactMarkdown
              key={index}
              components={{
                h1: ({ children }) => <h1 className={getClassName('markdownH1')}>{children}</h1>,
                h2: ({ children }) => <h2 className={getClassName('markdownH2')}>{children}</h2>,
                h3: ({ children }) => <h3 className={getClassName('markdownH3')}>{children}</h3>,
                p: ({ children }) => <p className={getClassName('markdownP')}>{children}</p>,
                ul: ({ children }) => <ul className={getClassName('markdownUl')}>{children}</ul>,
                ol: ({ children }) => <ol className={getClassName('markdownOl')}>{children}</ol>,
                li: ({ children }) => <li className={getClassName('markdownLi')}>{children}</li>,
                strong: ({ children }) => <strong className={getClassName('markdownStrong')}>{children}</strong>,
                em: ({ children }) => <em className={getClassName('markdownEm')}>{children}</em>,
                code: ({ children }) => <code className={getClassName('markdownCode')}>{children}</code>,
              }}
            >
              {part}
            </ReactMarkdown>
          );
        })}
      </>
    );
  };

  const handleSummarise = async () => {
    if (pageReadingState !== 'ready') return;
    
    // If already summarising, stop the request
    if (summariseState === 'summarising') {
      abortControllerRef.current?.abort();
      setSummariseState('idle');
      setStreamingText('');
      return;
    }

    // If done, clear the summary
    if (summariseState === 'done') {
      setSummary('');
      setSuggestedQuestions([]);
      setSummariseState('idle');
      return;
    }

    setSummariseState('summarising');
    setStreamingText('');
    setSummary('');
    setSuggestedQuestions([]);
    setErrorMessage('');

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const pageContent = await getStoredPageContent();
      if (!pageContent) {
        setSummariseState('error');
        setErrorMessage('Page content not available');
        return;
      }

      await SummariseService.summarise(
        {
          text: pageContent,
          context_type: 'PAGE',
        },
        {
          onChunk: (_chunk, accumulated) => {
            setStreamingText(accumulated);
          },
          onComplete: (finalSummary, questions) => {
            setSummary(finalSummary);
            setStreamingText('');
            setSuggestedQuestions(questions);
            setSummariseState('done');
          },
          onError: (errorCode, errorMsg) => {
            console.error('[SummaryView] Summarise error:', errorCode, errorMsg);
            setSummariseState('error');
            setErrorMessage(errorMsg);
          },
          onLoginRequired: () => {
            setSummariseState('idle');
            onLoginRequired?.();
          },
        },
        abortControllerRef.current
      );
    } catch (error) {
      console.error('[SummaryView] Summarise exception:', error);
      setSummariseState('error');
      setErrorMessage('An error occurred while summarising');
    }
  };

  const handleAskQuestion = async (question: string) => {
    if (!question.trim() || askingState === 'asking') return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: question.trim(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setAskingState('asking');
    setAskStreamingText('');

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const pageContent = await getStoredPageContent();

      await AskService.ask(
        {
          question: question.trim(),
          chat_history: [...chatMessages, userMessage],
          initial_context: pageContent || undefined,
          context_type: 'PAGE',
        },
        {
          onChunk: (_chunk, accumulated) => {
            setAskStreamingText(accumulated);
          },
          onComplete: (updatedChatHistory, questions) => {
            setChatMessages(updatedChatHistory);
            setSuggestedQuestions(questions);
            setAskStreamingText('');
            setAskingState('idle');
          },
          onError: (errorCode, errorMsg) => {
            console.error('[SummaryView] Ask error:', errorCode, errorMsg);
            setAskingState('error');
            setErrorMessage(errorMsg);
            setAskStreamingText('');
          },
          onLoginRequired: () => {
            setAskingState('idle');
            setAskStreamingText('');
            onLoginRequired?.();
          },
        },
        abortControllerRef.current
      );
    } catch (error) {
      console.error('[SummaryView] Ask exception:', error);
      setAskingState('error');
      setErrorMessage('An error occurred while asking');
      setAskStreamingText('');
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    handleAskQuestion(inputValue.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceRecord = () => {
    // TODO: Implement voice recording
    console.log('Voice recording not yet implemented');
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setSummary('');
    setStreamingText('');
    setAskStreamingText('');
    setSuggestedQuestions([]);
    setSummariseState('idle');
    setAskingState('idle');
    setErrorMessage('');
  };

  const handleQuestionClick = (question: string) => {
    // Auto-populate AND call API
    setInputValue(question);
    handleAskQuestion(question);
  };

  // Get button text and icon based on state
  const getButtonContent = () => {
    if (pageReadingState === 'reading') {
      return { text: `Reading page${'.'.repeat(dotCount)}`, icon: null };
    }
    if (summariseState === 'summarising') {
      return { text: 'Stop', icon: <Square size={14} /> };
    }
    if (summariseState === 'done') {
      return { text: 'Clear summary', icon: null };
    }
    return { text: 'Summarise page', icon: null };
  };

  const { text: buttonText, icon: buttonIcon } = getButtonContent();
  const isButtonDisabled = pageReadingState !== 'ready';

  // Get tooltip message based on hovered icon
  const getTooltipMessage = () => {
    switch (hoveredIcon) {
      case 'mic':
        return 'Voice input';
      case 'send':
        return 'Ask question';
      case 'delete':
        return 'Clear chat';
      default:
        return '';
    }
  };

  const getTooltipRef = () => {
    switch (hoveredIcon) {
      case 'mic':
        return micButtonRef;
      case 'send':
        return sendButtonRef;
      case 'delete':
        return deleteButtonRef;
      default:
        return null;
    }
  };

  return (
    <div className={getClassName('summaryView')}>
      {/* Scrollable Content Area */}
      <div className={getClassName('chatContainer')} ref={chatContainerRef}>
        {/* Summary Content with Header */}
        {(summary || streamingText) && (
          <div className={getClassName('summaryContent')}>
            <h4 className={getClassName('summaryHeader')}>Page summary</h4>
            <div className={getClassName('summaryText')}>
              {renderSummaryContent(summary || streamingText)}
              {summariseState === 'summarising' && (
                <span className={getClassName('cursor')}>|</span>
              )}
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && (
          <div className={getClassName('suggestedQuestions')}>
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                className={getClassName('questionItem')}
                onClick={() => handleQuestionClick(question)}
              >
                <Plus size={14} className={getClassName('questionIcon')} />
                <span className={getClassName('questionText')}>{question}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chat Messages */}
        {chatMessages.length > 0 && (
          <div className={getClassName('messages')}>
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`${getClassName('message')} ${getClassName(message.role === 'user' ? 'userMessage' : 'assistantMessage')}`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className={getClassName('markdownH1')}>{children}</h1>,
                      h2: ({ children }) => <h2 className={getClassName('markdownH2')}>{children}</h2>,
                      h3: ({ children }) => <h3 className={getClassName('markdownH3')}>{children}</h3>,
                      p: ({ children }) => <p className={getClassName('markdownP')}>{children}</p>,
                      ul: ({ children }) => <ul className={getClassName('markdownUl')}>{children}</ul>,
                      ol: ({ children }) => <ol className={getClassName('markdownOl')}>{children}</ol>,
                      li: ({ children }) => <li className={getClassName('markdownLi')}>{children}</li>,
                      strong: ({ children }) => <strong className={getClassName('markdownStrong')}>{children}</strong>,
                      em: ({ children }) => <em className={getClassName('markdownEm')}>{children}</em>,
                      code: ({ children }) => <code className={getClassName('markdownCode')}>{children}</code>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            ))}
            {/* Show streaming assistant response */}
            {askStreamingText && (
              <div className={`${getClassName('message')} ${getClassName('assistantMessage')}`}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className={getClassName('markdownP')}>{children}</p>,
                  }}
                >
                  {askStreamingText}
                </ReactMarkdown>
                <span className={getClassName('cursor')}>|</span>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!summary && !streamingText && chatMessages.length === 0 && summariseState === 'idle' && (
          <div className={getClassName('emptyState')}>
            <p>Click "Summarise page" to get started</p>
            <p>or</p>
            <p>Ask AI anything about the page</p>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className={getClassName('errorState')}>
            <p>{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Summarise Button Row */}
      <div className={getClassName('summariseButtonRow')}>
        <button
          className={`${getClassName('summariseButton')} ${summariseState === 'summarising' ? getClassName('stopButton') : ''}`}
          onClick={handleSummarise}
          disabled={isButtonDisabled}
        >
          {buttonIcon}
          {buttonText}
        </button>
      </div>

      {/* User Input Bar */}
      <div className={getClassName('inputBar')}>
        <div className={getClassName('inputWrapper')}>
          <input
            type="text"
            className={getClassName('input')}
            placeholder="Ask AI about the page"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={askingState === 'asking'}
          />
          <button
            ref={micButtonRef}
            className={getClassName('micButton')}
            onClick={handleVoiceRecord}
            onMouseEnter={() => setHoveredIcon('mic')}
            onMouseLeave={() => setHoveredIcon(null)}
            aria-label="Voice input"
            type="button"
          >
            <Mic size={16} />
          </button>
        </div>
        
        {/* Send Button */}
        <button
          ref={sendButtonRef}
          className={getClassName('sendButton')}
          onClick={handleSend}
          onMouseEnter={() => setHoveredIcon('send')}
          onMouseLeave={() => setHoveredIcon(null)}
          disabled={!inputValue.trim() || askingState === 'asking'}
          aria-label="Ask question"
          type="button"
        >
          <ArrowUp size={18} />
        </button>

        {/* Delete/Clear Button - Only show when there is content */}
        {hasContent && (
          <button
            ref={deleteButtonRef}
            className={getClassName('deleteButton')}
            onClick={handleClearChat}
            onMouseEnter={() => setHoveredIcon('delete')}
            onMouseLeave={() => setHoveredIcon(null)}
            aria-label="Clear chat"
            type="button"
          >
            <Trash2 size={18} />
          </button>
        )}

        {/* Tooltip */}
        {showTooltip && hoveredIcon && getTooltipRef()?.current && (
          <OnHoverMessage
            message={getTooltipMessage()}
            targetRef={getTooltipRef()!}
            position="top"
            offset={8}
          />
        )}
      </div>
    </div>
  );
};

SummaryView.displayName = 'SummaryView';
