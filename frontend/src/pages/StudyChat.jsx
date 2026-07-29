import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { apiRequest } from '../services/api';
import {
  MessageSquareCode,
  Send,
  Plus,
  Trash2,
  Code2,
  Briefcase,
  UserCheck,
  BookOpen,
  Sparkles,
  Bot
} from 'lucide-react';

export default function StudyChat() {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('study'); // study, placement, interview
  const [loading, setLoading] = useState(false);
  const [fetchingMsgs, setFetchingMsgs] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (currentConvId) {
      fetchMessages(currentConvId);
    } else {
      setMessages([]);
    }
  }, [currentConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchConversations = async () => {
    try {
      const data = await apiRequest('/chat/conversations');
      setConversations(data);
      if (data.length > 0 && !currentConvId) {
        setCurrentConvId(data[0].id);
        setMode(data[0].mode || 'study');
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      setFetchingMsgs(true);
      const data = await apiRequest(`/chat/conversations/${convId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setFetchingMsgs(false);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const newConv = await apiRequest('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: `New ${mode.toUpperCase()} Session`,
          mode: mode,
        }),
      });
      setConversations([newConv, ...conversations]);
      setCurrentConvId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await apiRequest(`/chat/conversations/${convId}`, { method: 'DELETE' });
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);
      if (currentConvId === convId) {
        setCurrentConvId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let convIdToUse = currentConvId;

    if (!convIdToUse) {
      try {
        const newConv = await apiRequest('/chat/conversations', {
          method: 'POST',
          body: JSON.stringify({
            title: input.slice(0, 25),
            mode: mode,
          }),
        });
        setConversations([newConv, ...conversations]);
        setCurrentConvId(newConv.id);
        convIdToUse = newConv.id;
      } catch (err) {
        console.error('Failed to create chat on send:', err);
        return;
      }
    }

    const userText = input;
    setInput('');

    const tempUserMsg = {
      id: Date.now(),
      conversation_id: convIdToUse,
      sender: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const resMsg = await apiRequest('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: convIdToUse,
          content: userText,
          mode: mode,
        }),
      });
      setMessages((prev) => [...prev, resMsg]);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const modeConfigs = [
    { id: 'study', label: 'Study Assistant', icon: BookOpen, desc: 'Technical & Academic Explanations' },
    { id: 'placement', label: 'Placement Prep', icon: Briefcase, desc: 'DS, Algorithms & Aptitude' },
    { id: 'interview', label: 'Interview Practice', icon: UserCheck, desc: 'Mock Technical & HR Questions' },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar
        title="AI Study Chat"
        description="Technical doubt solving, placement algorithms & mock interviews in Java"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-slate-900/60 border-r border-slate-800 flex flex-col p-4 shrink-0">
          <div className="mb-4 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Select Chat Mode</span>
            <div className="grid grid-cols-1 gap-1">
              {modeConfigs.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      active
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-blue-400" />
                    <div>
                      <div className="truncate">{m.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleCreateNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all mb-4"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat Session</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2 block">
              Recent History
            </span>
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 text-center">No chat history yet</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setCurrentConvId(c.id);
                    setMode(c.mode || 'study');
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    currentConvId === c.id
                      ? 'bg-slate-800 text-blue-300 border border-slate-700 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="truncate flex items-center gap-2">
                    <MessageSquareCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{c.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Chat Window */}
        <div className="flex-1 flex flex-col bg-slate-950/60 relative">
          <div className="p-3 border-b border-slate-800/60 bg-slate-900/30 flex items-center justify-between px-6">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Active Mode: <strong className="text-blue-400 capitalize">{mode} Assistant</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Code2 className="w-3.5 h-3.5" />
              <span>Java Default Coding Enabled</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {fetchingMsgs ? (
              <LoadingSpinner message="Loading messages..." />
            ) : messages.length === 0 ? (
              <EmptyState
                icon={MessageSquareCode}
                title="Start an AI Study Session"
                description="Ask technical, coding or academic questions. Gemini uses Java as the default language for algorithms & examples."
              />
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3.5 max-w-3xl ${
                    m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-md ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {m.sender === 'user' ? 'U' : <Bot className="w-4 h-4 text-indigo-400" />}
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed max-w-xl whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-600/15 rounded-tr-none'
                        : 'bg-slate-900 text-slate-200 border border-slate-800/80 shadow-md rounded-tl-none font-mono text-[13px]'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex gap-3.5 mr-auto">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>Gemini AI is generating solution in Java...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/40">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask any technical doubt, algorithm, or concept (Java code generated)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
