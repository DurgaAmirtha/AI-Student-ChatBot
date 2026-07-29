import os
import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from pypdf import PdfReader

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User, Document, DocumentChunk
from backend.app.schemas import DocumentResponse, DocumentRenameRequest, DocumentChatRequest
from backend.app.auth import get_current_user
from backend.app.rag import extract_text_chunks_from_pdf, get_embedding_vector, get_embedding_vectors_batch, retrieve_relevant_chunks
from backend.app.gemini import generate_rag_response

router = APIRouter()

MAX_FILE_SIZE = 15 * 1024 * 1024 # 15MB max

def process_pdf_background(doc_id: int, file_path: str, user_id: int):
    """Background task to extract text, compute embeddings, and store document chunks."""
    from backend.app.database import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user_id).first()
        if not doc:
            return

        # Get page count
        try:
            reader = PdfReader(file_path)
            doc.page_count = len(reader.pages)
        except Exception:
            doc.page_count = 0

        # Extract chunks (chunk size ~900, overlap ~150)
        chunks = extract_text_chunks_from_pdf(file_path, chunk_size=900, chunk_overlap=150)
        contents = [c["content"] for c in chunks]
        embedding_vectors = get_embedding_vectors_batch(contents)

        for chunk_data, emb_vec in zip(chunks, embedding_vectors):
            emb_json = json.dumps(emb_vec)

            chunk_obj = DocumentChunk(
                document_id=doc.id,
                user_id=user_id,
                page_number=chunk_data["page_number"],
                chunk_index=chunk_data["chunk_index"],
                content=chunk_data["content"],
                embedding=emb_json
            )
            db.add(chunk_obj)

        doc.status = "ready"
        db.commit()
    except Exception as e:
        print(f"[Document Processing Error] doc_id={doc_id}: {str(e)}")
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            db.commit()
    finally:
        db.close()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 15MB limit")

    # Generate UUID stored filename
    stored_filename = f"{uuid.uuid4().hex}.pdf"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        user_id=current_user.id,
        filename=file.filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size=len(content),
        page_count=0,
        status="processing"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Trigger async background text extraction and embedding creation
    background_tasks.add_task(process_pdf_background, doc.id, file_path, current_user.id)

    return DocumentResponse.model_validate(doc)

@router.get("/", response_model=List[DocumentResponse])
def get_user_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict User Data Isolation
    docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.uploaded_at.desc()).all()
    return [DocumentResponse.model_validate(d) for d in docs]

@router.put("/{doc_id}/rename", response_model=DocumentResponse)
def rename_document(
    doc_id: int,
    req: DocumentRenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    new_name = req.new_filename.strip()
    if not new_name.lower().endswith(".pdf"):
        new_name += ".pdf"

    doc.filename = new_name
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)

@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict User Data Isolation
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    # Remove file from disk
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"[Delete Document] Warning removing file {doc.file_path}: {e}")

    # Delete from DB (cascades to document_chunks)
    db.delete(doc)
    db.commit()
    return {"detail": "Document and associated chunks deleted successfully"}

@router.post("/chat")
def chat_with_documents(
    req: DocumentChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict User Data Isolation: Only query chunks belonging to current_user
    query_builder = db.query(DocumentChunk, Document.filename).join(Document, DocumentChunk.document_id == Document.id).filter(
        DocumentChunk.user_id == current_user.id
    )

    if req.document_id:
        doc = db.query(Document).filter(Document.id == req.document_id, Document.user_id == current_user.id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Requested document not found or access denied")
        query_builder = query_builder.filter(DocumentChunk.document_id == req.document_id)

    chunk_rows = query_builder.all()

    chunks_data = []
    for chunk_obj, filename in chunk_rows:
        chunks_data.append({
            "content": chunk_obj.content,
            "page_number": chunk_obj.page_number,
            "filename": filename,
            "embedding": chunk_obj.embedding
        })

    relevant_chunks = retrieve_relevant_chunks(req.question, chunks_data, top_k=4)
    rag_result = generate_rag_response(req.question, relevant_chunks)

    return rag_result
