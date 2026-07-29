import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { apiRequest } from '../services/api';
import {
  FileText,
  UploadCloud,
  Trash2,
  Edit2,
  Search,
  BookOpen,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';

export default function NotesChat() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [ragHistory, setRagHistory] = useState([]);

  const [deleteModalDoc, setDeleteModalDoc] = useState(null);
  const [renameModalDoc, setRenameModalDoc] = useState(null);
  const [newFilename, setNewFilename] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Poll document status automatically while any document is in 'processing' status
  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiRequest('/documents/');
        setDocuments(data);
      } catch (err) {
        console.error('Error polling document status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/documents/');
      setDocuments(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File size must be less than 15MB');
      return;
    }

    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadedDoc = await apiRequest('/documents/upload', {
        method: 'POST',
        body: formData,
      });
      setDocuments((prev) => [uploadedDoc, ...prev.filter((d) => d.id !== uploadedDoc.id)]);
    } catch (err) {
      setError(err.message || 'Failed to upload PDF note');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalDoc) return;
    try {
      await apiRequest(`/documents/${deleteModalDoc.id}`, { method: 'DELETE' });
      setDocuments(documents.filter((d) => d.id !== deleteModalDoc.id));
      if (selectedDocId === deleteModalDoc.id) {
        setSelectedDocId(null);
      }
      setDeleteModalDoc(null);
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    }
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    if (!renameModalDoc || !newFilename.trim()) return;
    try {
      const updated = await apiRequest(`/documents/${renameModalDoc.id}/rename`, {
        method: 'PUT',
        body: JSON.stringify({ new_filename: newFilename }),
      });
      setDocuments(documents.map((d) => (d.id === updated.id ? updated : d)));
      setRenameModalDoc(null);
      setNewFilename('');
    } catch (err) {
      setError(err.message || 'Failed to rename note');
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const userQ = question;
    setQuestion('');
    setAsking(true);

    const tempQa = {
      question: userQ,
      answer: null,
      sources: null,
      loading: true,
    };
    setRagHistory((prev) => [tempQa, ...prev]);

    try {
      const res = await apiRequest('/documents/chat', {
        method: 'POST',
        body: JSON.stringify({
          question: userQ,
          document_id: selectedDocId,
        }),
      });

      setRagHistory((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                question: userQ,
                answer: res.answer,
                sources: res.sources,
                loading: false,
              }
            : item
        )
      );
    } catch (err) {
      setRagHistory((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                question: userQ,
                answer: `Error answering question: ${err.message}`,
                sources: [],
                loading: false,
              }
            : item
        )
      );
    } finally {
      setAsking(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar
        title="Saved Notes & PDF RAG Chat"
        description="Upload your study materials and ask grounded questions with source page references"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Upload & Notes Management */}
        <div className="w-80 bg-slate-900/60 border-r border-slate-800 flex flex-col p-4 shrink-0">
          <div className="mb-4">
            <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl bg-slate-900/80 cursor-pointer transition-all">
              <UploadCloud className="w-8 h-8 text-blue-400 mb-1" />
              <span className="text-xs font-semibold text-slate-200">
                {uploading ? 'Processing PDF...' : 'Upload PDF Notes'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">PDF up to 15MB</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              My Saved Notes ({documents.length})
            </span>
          </div>

          <div className="mb-3">
            <button
              onClick={() => setSelectedDocId(null)}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                selectedDocId === null
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Search All Uploaded Notes</span>
              </div>
              {selectedDocId === null && <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full">Active</span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <LoadingSpinner message="Loading notes..." />
            ) : documents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center p-6">No notes uploaded yet</p>
            ) : (
              documents.map((doc) => {
                const selected = selectedDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer ${
                      selected
                        ? 'bg-slate-800 border-blue-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                        <div className="truncate">
                          <h4 className="text-xs font-semibold text-slate-200 truncate">{doc.filename}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {doc.page_count} Pages • {formatFileSize(doc.file_size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameModalDoc(doc);
                            setNewFilename(doc.filename);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalDoc(doc);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          doc.status === 'ready'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : doc.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400 animate-pulse'
                        }`}
                      >
                        {doc.status === 'ready' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Ready for RAG
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> {doc.status}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: RAG Window */}
        <div className="flex-1 flex flex-col bg-slate-950/60 relative">
          <div className="p-3 border-b border-slate-800/60 bg-slate-900/30 flex items-center justify-between px-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>
                Scope:{' '}
                <strong className="text-blue-400">
                  {selectedDocId
                    ? documents.find((d) => d.id === selectedDocId)?.filename || 'Selected Note'
                    : 'All Uploaded Notes'}
                </strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Grounded in PDF Context with Page Citations
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {ragHistory.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Ask Questions Based on Your PDF Notes"
                description="Upload your lecture notes, PDFs, or books. Gemini RAG extracts exact text chunks and cites page numbers."
              />
            ) : (
              ragHistory.map((item, idx) => (
                <div key={idx} className="space-y-3 max-w-3xl mx-auto">
                  <div className="p-3.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-xs text-blue-100 font-medium ml-auto max-w-lg">
                    {item.question}
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs leading-relaxed text-slate-200 shadow-md">
                    {item.loading ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                        <span>Searching relevant chunks and retrieving Gemini answer...</span>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap">{item.answer}</p>
                        {item.sources && item.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Sources:</span>
                            {item.sources.map((src, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-300"
                              >
                                {src.document_name} (Page {src.page})
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/40">
            <form onSubmit={handleAskQuestion} className="flex gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask any question from your PDF notes..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={!question.trim() || asking}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span>Ask Note</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteModalDoc}
        title={`Delete "${deleteModalDoc?.filename}"?`}
        message="Deleting this note will permanently remove its physical file from disk, text chunks, and embedding data."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalDoc(null)}
        confirmText="Delete Note"
        isDanger={true}
      />

      {renameModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-100 text-base mb-4">Rename PDF Note</h3>
            <form onSubmit={handleConfirmRename} className="space-y-4">
              <input
                type="text"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModalDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
