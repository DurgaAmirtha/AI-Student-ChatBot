import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="glass-card rounded-2xl p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 border border-slate-800">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-base font-bold text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-xs">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
