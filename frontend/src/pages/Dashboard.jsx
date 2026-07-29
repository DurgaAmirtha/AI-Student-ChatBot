import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiRequest } from '../services/api';
import {
  FileText,
  BrainCircuit,
  Award,
  AlertTriangle,
  ArrowRight,
  MessageSquareCode,
  Sparkles,
  BookOpenCheck
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await apiRequest('/analytics/dashboard');
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner message="Fetching dashboard analytics..." />;

  return (
    <div className="flex-1 pb-10 overflow-y-auto">
      <Navbar
        title="Student Dashboard Overview"
        description="Track your academic performance, weak topics, and AI study tools"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded Notes</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{data?.total_notes || 0}</h3>
              <span className="text-[11px] text-blue-400 mt-0.5 inline-block">PDF RAG Ready</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quizzes Completed</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{data?.total_quizzes || 0}</h3>
              <span className="text-[11px] text-indigo-400 mt-0.5 inline-block">MCQ Practice</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Accuracy</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{data?.average_accuracy || 0}%</h3>
              <span className="text-[11px] text-emerald-400 mt-0.5 inline-block">Overall Score</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weak Topics</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{data?.weak_topics?.length || 0}</h3>
              <span className="text-[11px] text-amber-400 mt-0.5 inline-block">Requires Revision</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick Launcher Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            onClick={() => navigate('/chat')}
            className="glass-card glass-card-hover p-6 rounded-2xl border border-slate-800 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <MessageSquareCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">AI Study Chat</h4>
                <p className="text-xs text-slate-400">Study, Placement & Interview Practice</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-blue-400 pt-2 border-t border-slate-800/60">
              <span>Java Default Coding Assistant</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => navigate('/notes')}
            className="glass-card glass-card-hover p-6 rounded-2xl border border-slate-800 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Saved Notes & RAG</h4>
                <p className="text-xs text-slate-400">Upload PDF & ask document questions</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 pt-2 border-t border-slate-800/60">
              <span>PDF Page Citation Enabled</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => navigate('/quiz')}
            className="glass-card glass-card-hover p-6 rounded-2xl border border-slate-800 cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Smart Quiz Generator</h4>
                <p className="text-xs text-slate-400">Test concepts with instant feedback</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 pt-2 border-t border-slate-800/60">
              <span>Topic or Document MCQs</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Recommended Revision Topics */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-base">Recommended Topics to Revise</h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {data?.recommended_topics?.map((topic, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-2 hover:border-amber-500/40 transition-colors"
              >
                <BookOpenCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
