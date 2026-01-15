import { useState, useRef, useEffect } from 'react';
import { addWeeks, format } from 'date-fns';
import { parseScheduleCommand } from '../lib/scheduleParser';
import { useUpdateDaySchedule } from '../hooks/useSchedule';
import { useCreateActivity } from '../hooks/useActivities';
import type { Person, Activity } from '../types';

interface AIAssistantProps {
  people: Person[];
  activities: Activity[];
  currentWeekStart: Date;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistant({ people, activities, currentWeekStart }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I can help update Sky\'s schedule. Try:\n• "pickup assignment: sun: Asaf, mon: Tamir, tue: Gili"\n• "add weekly event on Mondays called Hip Hop at 16:30 in Gan Meir"\n• "set Friday as no gan"',
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateDay = useUpdateDaySchedule();
  const createActivity = useCreateActivity();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    setInput('');
    addMessage('user', userInput);
    setIsProcessing(true);

    // Determine which week to use - default to next week for assignments
    const isNextWeek = userInput.toLowerCase().includes('next week');
    const targetWeekStart = isNextWeek ? addWeeks(currentWeekStart, 1) : currentWeekStart;

    const command = parseScheduleCommand(userInput, people, activities, targetWeekStart);

    try {
      switch (command.type) {
        case 'add_activity': {
          await createActivity.mutateAsync(command.activity);
          addMessage('assistant', `Added "${command.activity.name}" as a recurring ${command.activity.recurrence_day} activity at ${command.activity.default_time}${command.activity.address ? ` in ${command.activity.address}` : ''}.`);
          break;
        }

        case 'update_pickups': {
          for (const assignment of command.assignments) {
            await updateDay.mutateAsync({
              date: assignment.date,
              pickup_person_id: assignment.person_id,
            });
          }
          const summary = command.assignments
            .map((a) => {
              const person = people.find((p) => p.id === a.person_id);
              return `${format(new Date(a.date), 'EEE')}: ${person?.name}`;
            })
            .join(', ');
          addMessage('assistant', `Updated pickup assignments: ${summary}`);
          break;
        }

        case 'update_dropoffs': {
          for (const assignment of command.assignments) {
            await updateDay.mutateAsync({
              date: assignment.date,
              dropoff_person_id: assignment.person_id,
            });
          }
          const summary = command.assignments
            .map((a) => {
              const person = people.find((p) => p.id === a.person_id);
              return `${format(new Date(a.date), 'EEE')}: ${person?.name}`;
            })
            .join(', ');
          addMessage('assistant', `Updated drop-off assignments: ${summary}`);
          break;
        }

        case 'update_bedtimes': {
          for (const assignment of command.assignments) {
            await updateDay.mutateAsync({
              date: assignment.date,
              bedtime_person_id: assignment.person_id,
            });
          }
          const summary = command.assignments
            .map((a) => {
              const person = people.find((p) => p.id === a.person_id);
              return `${format(new Date(a.date), 'EEE')}: ${person?.name}`;
            })
            .join(', ');
          addMessage('assistant', `Updated bedtime assignments: ${summary}`);
          break;
        }

        case 'set_no_gan': {
          await updateDay.mutateAsync({
            date: command.date,
            is_no_gan: true,
            no_gan_reason: command.reason || 'No Gan',
          });
          addMessage('assistant', `Marked ${format(new Date(command.date), 'EEEE, MMM d')} as no Gan${command.reason ? ` (${command.reason})` : ''}.`);
          break;
        }

        case 'error': {
          addMessage('assistant', command.message);
          break;
        }
      }
    } catch (error) {
      addMessage('assistant', `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                Processing...
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
              placeholder="Type a command..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
          </form>
        </div>
      )}
    </>
  );
}
