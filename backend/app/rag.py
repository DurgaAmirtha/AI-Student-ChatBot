import json
import math
import numpy as np
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from backend.app.config import settings

def extract_text_chunks_from_pdf(file_path: str, chunk_size: int = 900, chunk_overlap: int = 150) -> List[Dict[str, Any]]:
    """
    Extract text page-by-page from PDF and split into chunks of ~900 chars with 150 char overlap.
    Returns list of dicts: {"page_number": int, "chunk_index": int, "content": str}
    """
    reader = PdfReader(file_path)
    chunks = []
    chunk_counter = 0

    for page_idx, page in enumerate(reader.pages):
        page_num = page_idx + 1
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        
        if not page_text:
            continue

        # Chunk page text
        start = 0
        text_len = len(page_text)

        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk_text = page_text[start:end].strip()
            
            if len(chunk_text) > 20: # ignore tiny fragments
                chunks.append({
                    "page_number": page_num,
                    "chunk_index": chunk_counter,
                    "content": chunk_text
                })
                chunk_counter += 1
                
            start += (chunk_size - chunk_overlap)
            if start >= text_len or end == text_len:
                break

    return chunks

def _fallback_vectorizer(text: str) -> List[float]:
    """Fast deterministic n-gram hashing vectorizer for offline fallback."""
    vec = [0.0] * 128
    words = text.lower().split()
    for word in words:
        h = sum(ord(c) for c in word) % 128
        vec[h] += 1.0
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

def get_embedding_vectors_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embedding vectors for a list of text strings in batch using Google Gemini API
    or fallback vectorizer.
    """
    if not texts:
        return []

    results = [None] * len(texts)
    if settings.GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            batch_size = 20
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                try:
                    response = client.models.embed_content(
                        model="text-embedding-004",
                        contents=batch_texts,
                    )
                    if hasattr(response, "embeddings") and response.embeddings:
                        for idx, emb in enumerate(response.embeddings):
                            if i + idx < len(texts):
                                results[i + idx] = emb.values
                    elif hasattr(response, "embedding") and response.embedding:
                        results[i] = response.embedding.values
                except Exception as b_err:
                    print(f"[RAG] Batch embedding sub-error: {b_err}")
        except Exception as e:
            print(f"[RAG] Gemini embedding client error: {e}. Using fallback vectorizer.")

    # Fill any missing vectors with fallback vectorizer
    for idx, res in enumerate(results):
        if res is None:
            results[idx] = _fallback_vectorizer(texts[idx])

    return results

def get_embedding_vector(text: str) -> List[float]:
    """
    Generate embedding vector for single string.
    """
    res = get_embedding_vectors_batch([text])
    return res[0] if res else _fallback_vectorizer(text)

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a = np.array(v1, dtype=float)
    b = np.array(v2, dtype=float)
    if len(a) != len(b):
        # Resize or fallback if dimension mismatch
        min_len = min(len(a), len(b))
        a = a[:min_len]
        b = b[:min_len]
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

def retrieve_relevant_chunks(query: str, chunks_data: List[Dict[str, Any]], top_k: int = 4) -> List[Dict[str, Any]]:
    """
    Given a query and a list of chunks (each containing content, page_number, filename, and embedding JSON),
    returns top_k most relevant chunks with similarity score.
    """
    if not chunks_data:
        return []

    query_vec = get_embedding_vector(query)
    scored_chunks = []

    for chunk in chunks_data:
        emb_json = chunk.get("embedding")
        if isinstance(emb_json, str):
            try:
                emb_vec = json.loads(emb_json)
            except Exception:
                emb_vec = get_embedding_vector(chunk.get("content", ""))
        elif isinstance(emb_json, list):
            emb_vec = emb_json
        else:
            emb_vec = get_embedding_vector(chunk.get("content", ""))

        sim = cosine_similarity(query_vec, emb_vec)
        scored_chunks.append({
            "content": chunk.get("content"),
            "page_number": chunk.get("page_number"),
            "filename": chunk.get("filename", "Uploaded Document"),
            "similarity": sim
        })

    scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
    return scored_chunks[:top_k]
