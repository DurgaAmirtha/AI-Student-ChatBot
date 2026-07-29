import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Code2, BookOpen } from 'lucide-react';

export default function Navbar({ title, description }) {
  const { user } = useAuth();

  return (
    <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          {title}
        </h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-medium text-blue-300">
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Default Coding: <strong>Java</strong></span>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini RAG Active</span>
        </div>
      </div>
    </header>
  );
}
