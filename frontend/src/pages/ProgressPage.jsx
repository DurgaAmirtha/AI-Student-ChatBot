import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { apiRequest } from '../services/api';
import {
  TrendingUp,
  AlertTriangle,
  Award,
  History,
  BookOpenCheck,
  CheckCircle2
} from 'lucide-react';

export default function ProgressPage() {
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [dashRes, histRes] = await Promise.all([
          apiRequest('/analytics/dashboard'),
          apiRequest('/quiz/history'),
        ]);
        setAnalytics(dashRes);
        setHistory(histRes);
      } catch (err) {
        setError(err.message || 'Failed to fetch progress data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Calculating performance analytics..." />;

  return (
    <div className="flex-1 pb-10 overflow-y-auto">
      <Navbar
        title="Weak Topic Tracker & Analytics"
        description="Track quiz performance, identify weak technical concepts, and follow revision recommendations"
      />

      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Identified Weak Topics</h3>
              <p className="text-xs text-slate-400">Topics where quiz accuracy fell below target threshold</p>
            </div>
          </div>

          {analytics?.weak_topics?.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              No weak topics detected yet. Complete quizzes to get automated analysis.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics?.weak_topics?.map((wt) => (
                <div key={wt.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-200 text-xs">{wt.topic_name}</h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        wt.accuracy_percentage < 60
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {wt.accuracy_percentage.toFixed(1)}% Accuracy
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        wt.accuracy_percentage < 60 ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(wt.accuracy_percentage, 5)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                    <span>Attempted: {wt.total_questions} Qs</span>
                    <span>Incorrect: {wt.incorrect_count} Qs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <BookOpenCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-base">Recommended Topics to Revise</h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {analytics?.recommended_topics?.map((topic, idx) => (
              <div
                key={idx}
                className="px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-300 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Quiz Score History</h3>
              <p className="text-xs text-slate-400">Past quiz attempts and accuracy breakdown</p>
            </div>
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No Quiz History Yet"
              description="Complete a quiz in the Quiz Generator to track score history and accuracy trends."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Quiz Title</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Accuracy</th>
                    <th className="p-3">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((h) => (
                    <tr key={h.attempt_id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-semibold text-slate-200">{h.quiz_title}</td>
                      <td className="p-3 text-slate-300">
                        {h.score} / {h.total_questions}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            h.score_percentage >= 80
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : h.score_percentage >= 50
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {h.score_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {new Date(h.completed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
