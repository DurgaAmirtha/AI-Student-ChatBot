import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiRequest } from '../services/api';
import {
  BrainCircuit,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  HelpCircle,
  BookOpen
} from 'lucide-react';

export default function QuizPage() {
  const [documents, setDocuments] = useState([]);
  const [topic, setTopic] = useState('Java Collections & Data Structures');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const data = await apiRequest('/documents/');
        setDocuments(data.filter((d) => d.status === 'ready'));
      } catch (err) {
        console.error('Failed to fetch docs for quiz:', err);
      }
    }
    fetchDocs();
  }, []);

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setQuiz(null);
    setResult(null);
    setUserAnswers({});

    try {
      const payload = {
        topic: selectedDocId ? null : topic,
        document_id: selectedDocId ? parseInt(selectedDocId) : null,
        difficulty: difficulty,
        num_questions: parseInt(numQuestions),
      };

      const quizData = await apiRequest('/quiz/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setQuiz(quizData);
    } catch (err) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qId, optionKey) => {
    if (result) return;
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optionKey,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;

    const answersList = quiz.questions.map((q) => ({
      question_id: q.id,
      selected_option: userAnswers[q.id] || 'A',
    }));

    setSubmitting(true);
    try {
      const res = await apiRequest('/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({
          quiz_id: quiz.id,
          answers: answersList,
        }),
      });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to submit quiz answers');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 pb-10 overflow-y-auto">
      <Navbar
        title="Smart Quiz Generator"
        description="Generate multiple-choice practice quizzes from topics or uploaded PDF notes"
      />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {!quiz && (
          <div className="glass-card p-8 rounded-3xl border border-slate-800 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Create New Quiz</h3>
                <p className="text-xs text-slate-400">Generate tailored MCQs to test technical understanding</p>
              </div>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Quiz Source</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDocId('')}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                      !selectedDocId
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Custom Topic Name
                  </button>
                  <button
                    type="button"
                    disabled={documents.length === 0}
                    onClick={() => {
                      if (documents.length > 0) setSelectedDocId(documents[0].id.toString());
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                      selectedDocId
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 disabled:opacity-40'
                    }`}
                  >
                    Uploaded PDF Document
                  </button>
                </div>
              </div>

              {!selectedDocId ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Java OOPs, Operating Systems, SQL Indexes"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select PDF Document</label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.page_count} pages)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Number of Questions</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Generating Gemini Quiz...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-4 h-4" />
                    <span>Generate Quiz</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {quiz && (
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  Quiz #{quiz.id} • {quiz.difficulty} Level
                </span>
                <h2 className="text-lg font-bold text-slate-100 mt-0.5">{quiz.title}</h2>
              </div>
              <button
                onClick={() => setQuiz(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Back to Generator
              </button>
            </div>

            {quiz.questions.map((q, idx) => {
              const options = [
                { key: 'A', text: q.option_a },
                { key: 'B', text: q.option_b },
                { key: 'C', text: q.option_c },
                { key: 'D', text: q.option_d },
              ];

              const resItem = result?.results?.find((r) => r.question_id === q.id);

              return (
                <div key={q.id} className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-100 text-sm leading-relaxed">
                      <span className="text-blue-400 font-bold mr-2">Q{idx + 1}.</span>
                      {q.question_text}
                    </h3>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-slate-400 font-medium shrink-0">
                      {q.topic_tag}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((opt) => {
                      const selected = userAnswers[q.id] === opt.key;
                      let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                      if (result) {
                        if (opt.key === resItem?.correct_option) {
                          btnStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold';
                        } else if (selected && !resItem?.is_correct) {
                          btnStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold';
                        }
                      } else if (selected) {
                        btnStyle = 'bg-blue-600/25 border-blue-500 text-blue-200 font-semibold';
                      }

                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleOptionSelect(q.id, opt.key)}
                          className={`p-3.5 rounded-2xl border text-xs text-left transition-all flex items-center gap-3 ${btnStyle}`}
                        >
                          <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {opt.key}
                          </span>
                          <span className="leading-snug">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {resItem && (
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1 mt-3">
                      <div className="flex items-center gap-2 font-bold">
                        {resItem.is_correct ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Correct Answer!
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Incorrect (Correct: {resItem.correct_option})
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 pt-1 leading-relaxed">{resItem.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {!result ? (
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
                >
                  <span>Submit Quiz Answers</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="glass-card p-8 rounded-3xl border border-emerald-500/30 text-center max-w-xl mx-auto space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100">Quiz Completed!</h3>
                <p className="text-sm text-slate-300">
                  Score: <strong className="text-emerald-400">{result.score}</strong> / {result.total_questions} ({result.score_percentage.toFixed(1)}%)
                </p>
                <p className="text-xs text-slate-400">Your performance statistics & weak topics have been updated.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
