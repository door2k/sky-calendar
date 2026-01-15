import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useUpdateDaySchedule, useUpdateSaturdaySchedule } from '../hooks/useSchedule';
import { useCreateActivity, useDeleteActivity } from '../hooks/useActivities';
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

export function AIAssistant({ people, activities, currentWeekStart, schedules = [] }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m Sky\'s schedule assistant. Just tell me what you need in plain language, like:\n\n"Set Tamir for pickup on Monday and Tuesday"\n"Add a hip hop class on Mondays at 4:30pm in Gan Meir"\n"Mark Friday as no gan because of a holiday"',
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const executeActions = async (actions: AssistantAction[]) => {
    const results: string[] = [];

    // Debug: log the raw actions from Claude
    console.log('Raw actions from Claude:', JSON.stringify(actions, null, 2));

    // Debug: Show action types in chat for debugging (temporary)
    const actionTypes = actions.map(a => a.type).join(', ');
    console.log('Action types received:', actionTypes);
    addMessage('assistant', `[DEBUG] Actions received: ${actionTypes}`);

    // Sort actions so create_activity runs before assign_activity
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

    console.log('Sorted actions:', JSON.stringify(sortedActions, null, 2));

    for (const action of sortedActions) {
      try {
        switch (action.type) {
          case 'update_day': {
            if (action.date && action.updates) {
              await updateDay.mutateAsync({
                date: action.date,
                ...action.updates,
              } as Parameters<typeof updateDay.mutateAsync>[0]);
              results.push(`Updated ${action.date}`);
            }
            break;
          }

          case 'create_activity': {
            if (action.activity) {
              const newActivity = await createActivity.mutateAsync(action.activity);
              results.push(`Created activity: ${newActivity.name}`);
              console.log('Created activity with ID:', newActivity.id);
              addMessage('assistant', `[DEBUG] Created activity ID: ${newActivity.id}`);

              // If there's also an assign_activity action for this new activity,
              // we need to update its activity_id
              const assignAction = sortedActions.find(
                a => a.type === 'assign_activity' && !a.activity_id
              );
              console.log('Found assignAction:', assignAction);
              if (assignAction) {
                assignAction.activity_id = newActivity.id;
                console.log('Updated assignAction with ID:', assignAction);
              }

              // If there's also an update_saturday action, update its activities array
              // to include the new activity_id
              const saturdayAction = sortedActions.find(
                a => a.type === 'update_saturday'
              );
              console.log('Found saturdayAction:', saturdayAction);
              addMessage('assistant', `[DEBUG] Found saturdayAction: ${JSON.stringify(saturdayAction)}`);

              if (saturdayAction && saturdayAction.activities) {
                // Find the first activity without an activity_id and set it
                for (const act of saturdayAction.activities) {
                  if (!act.activity_id) {
                    act.activity_id = newActivity.id;
                    console.log('Set activity_id on:', act);
                    addMessage('assistant', `[DEBUG] Set activity_id on activity: ${JSON.stringify(act)}`);
                    break; // Only set one per create_activity
                  }
                }
              }
            }
            break;
          }

          case 'assign_activity': {
            console.log('Processing assign_activity:', action);
            if (action.date && action.activity_id) {
              console.log('Assigning activity', action.activity_id, 'to date', action.date);
              await updateDay.mutateAsync({
                date: action.date,
                after_gan_activity_id: action.activity_id,
                after_gan_time: action.time,
              });
              results.push(`Assigned activity to ${action.date}`);
            } else {
              console.log('Skipping assign_activity - missing date or activity_id:', { date: action.date, activity_id: action.activity_id });
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
            console.log('Processing update_saturday:', action);
            addMessage('assistant', `[DEBUG] update_saturday action: ${JSON.stringify(action)}`);
            if (action.date && action.activities) {
              // Filter to only activities with valid activity_ids
              const validActivities = action.activities.filter(act => act.activity_id);
              console.log('Valid activities for Saturday:', validActivities);
              addMessage('assistant', `[DEBUG] Valid activities after filter: ${JSON.stringify(validActivities)}`);
              if (validActivities.length > 0) {
                try {
                  const payload = {
                    date: action.date,
                    activities: validActivities,
                    notes: action.notes,
                  };
                  addMessage('assistant', `[DEBUG] Calling updateSaturday with: ${JSON.stringify(payload)}`);
                  await updateSaturday.mutateAsync(payload);
                  results.push(`Updated Saturday ${action.date}`);
                  addMessage('assistant', `[DEBUG] Saturday update SUCCESS for ${action.date}`);
                } catch (err) {
                  console.error('Saturday update failed:', err);
                  const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
                  addMessage('assistant', `[DEBUG] Saturday update FAILED: ${errorMsg}`);
                }
              } else {
                console.log('No valid activities for Saturday update');
                addMessage('assistant', `[DEBUG] No valid activities - skipping Saturday update`);
              }
            } else {
              console.log('Missing date or activities for update_saturday');
              addMessage('assistant', `[DEBUG] Missing date or activities for update_saturday`);
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
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
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
            Schedule Assistant
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
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me what you need..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
          </form>
        </div>
      )}
    </>
  );
}
