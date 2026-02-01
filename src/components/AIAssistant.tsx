import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useUpdateDaySchedule, useUpdateSaturdaySchedule } from '../hooks/useSchedule';
import { useCreateActivity, useDeleteActivity } from '../hooks/useActivities';
import { useI18n } from '../lib/i18n';
import type { Person, Activity, DaySchedule, SaturdayActivity } from '../types';

interface AIAssistantProps {
  people: Person[];
  activities: Activity[];
  currentWeekStart: Date;
  schedules?: DaySchedule[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantAction {
  type: 'update_day' | 'create_activity' | 'assign_activity' | 'delete_activity' | 'update_saturday' | 'message';
  date?: string;
  updates?: Record<string, unknown>;
  activity?: Omit<Activity, 'id'>;
  activity_id?: string;
  time?: string;
  text?: string;
  activities?: SaturdayActivity[];
  notes?: string;
}

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export function AIAssistant({ people, activities, currentWeekStart, schedules = [] }: AIAssistantProps) {
  const { t, lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('ai_greeting'),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check for Web Speech API support
  const speechSupported = typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  const updateDay = useUpdateDaySchedule();
  const updateSaturday = useUpdateSaturdaySchedule();
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported) return;

    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Start listening
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang === 'he' ? 'he-IL' : 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);

      // If result is final, auto-submit
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const executeActions = async (actions: AssistantAction[]) => {
    const results: string[] = [];

    // Sort actions so create_activity runs before assign_activity/update_saturday
    // This ensures the new activity ID is available for assignment
    const actionOrder: Record<string, number> = {
      'create_activity': 0,
      'update_day': 1,
      'assign_activity': 2,
      'delete_activity': 3,
      'update_saturday': 4,
      'message': 5,
    };
    const sortedActions = [...actions].sort(
      (a, b) => (actionOrder[a.type] ?? 99) - (actionOrder[b.type] ?? 99)
    );

    for (const action of sortedActions) {
      try {
        switch (action.type) {
          case 'update_day': {
            if (action.date && action.updates) {
              await updateDay.mutateAsync({
                date: action.date,
                ...action.updates,
                updated_by: 'AI Assistant',
              } as Parameters<typeof updateDay.mutateAsync>[0]);
              results.push(`Updated ${action.date}`);
            }
            break;
          }

          case 'create_activity': {
            if (action.activity) {
              const newActivity = await createActivity.mutateAsync({
                ...action.activity,
                created_by: 'AI Assistant',
              });
              results.push(`Created activity: ${newActivity.name}`);

              // If there's also an assign_activity action for this new activity,
              // we need to update its activity_id
              const assignAction = sortedActions.find(
                a => a.type === 'assign_activity' && !a.activity_id
              );
              if (assignAction) {
                assignAction.activity_id = newActivity.id;
              }

              // If there's also an update_saturday action, update its activities array
              // to include the new activity_id
              const saturdayAction = sortedActions.find(
                a => a.type === 'update_saturday'
              );
              if (saturdayAction && saturdayAction.activities) {
                // Find the first activity without an activity_id and set it
                for (const act of saturdayAction.activities) {
                  if (!act.activity_id) {
                    act.activity_id = newActivity.id;
                    break; // Only set one per create_activity
                  }
                }
              }
            }
            break;
          }

          case 'assign_activity': {
            if (action.date && action.activity_id) {
              await updateDay.mutateAsync({
                date: action.date,
                after_gan_activity_id: action.activity_id,
                after_gan_time: action.time,
                updated_by: 'AI Assistant',
              });
              results.push(`Assigned activity to ${action.date}`);
            }
            break;
          }

          case 'delete_activity': {
            if (action.activity_id) {
              await deleteActivity.mutateAsync(action.activity_id);
              results.push(`Deleted activity`);
            }
            break;
          }

          case 'update_saturday': {
            if (action.date && action.activities) {
              // Filter to only activities with valid activity_ids
              const validActivities = action.activities.filter(act => act.activity_id);
              if (validActivities.length > 0) {
                await updateSaturday.mutateAsync({
                  date: action.date,
                  activities: validActivities,
                  notes: action.notes,
                  updated_by: 'AI Assistant',
                });
                results.push(`Updated Saturday ${action.date}`);
              }
            }
            break;
          }

          case 'message': {
            if (action.text) {
              addMessage('assistant', action.text);
            }
            break;
          }
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
        results.push(`Failed: ${action.type}`);
      }
    }

    return results;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    setInput('');
    addMessage('user', userInput);
    setIsProcessing(true);

    try {
      // Get conversation history (exclude the initial greeting)
      const conversationHistory = messages.slice(1).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          people,
          activities,
          schedules,
          currentWeekStart: format(currentWeekStart, 'yyyy-MM-dd'),
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'API request failed');
      }

      const data = await response.json();

      if (data.actions && Array.isArray(data.actions)) {
        await executeActions(data.actions);
      } else if (data.error) {
        addMessage('assistant', `Sorry, something went wrong: ${data.error}`);
      }
    } catch (error) {
      console.error('Assistant error:', error);
      addMessage(
        'assistant',
        `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-50 transition-transform hover:scale-105"
        style={{ backgroundColor: 'var(--color-primary)' }}
        aria-label={isOpen ? t('close_assistant') : t('open_assistant')}
      >
        {isOpen ? '×' : '✨'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 md:w-96 bg-white rounded-lg shadow-xl border z-50 flex flex-col max-h-[70vh]">
          {/* Header */}
          <div
            className="px-4 py-3 rounded-t-lg text-white font-medium"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {t('schedule_assistant')}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${
                  message.role === 'user'
                    ? 'ml-8 bg-gray-100'
                    : 'mr-8 bg-blue-50'
                } rounded-lg p-3 text-sm whitespace-pre-wrap`}
              >
                {message.content}
              </div>
            ))}
            {isProcessing && (
              <div className="mr-8 bg-blue-50 rounded-lg p-3 text-sm text-gray-500">
                {t('thinking')}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? t('listening') : t('tell_me_what_you_need')}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isListening ? 'border-red-400 bg-red-50' : ''
                }`}
                disabled={isProcessing}
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={isProcessing}
                  className={`px-3 py-2 rounded-lg text-white transition-colors ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                  aria-label={isListening ? t('stop_listening') : t('start_voice_input')}
                >
                  🎤
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
