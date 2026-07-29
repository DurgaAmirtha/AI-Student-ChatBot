from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json

from backend.app.database import get_db
from backend.app.models import User, Conversation, Message
from backend.app.schemas import (
    ConversationCreate, ConversationResponse, MessageCreate, MessageResponse, SourceItem
)
from backend.app.auth import get_current_user
from backend.app.gemini import generate_study_chat_response

router = APIRouter()

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    req: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = Conversation(
        user_id=current_user.id,
        title=req.title or "New Study Session",
        mode=req.mode or "study"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationResponse.model_validate(conv)

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict User Data Isolation
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc()).all()
    return [ConversationResponse.model_validate(c) for c in convs]

@router.get("/conversations/{conv_id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(
    conv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    msgs = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at.asc()).all()

    response_list = []
    for m in msgs:
        sources_list = None
        if m.sources:
            try:
                sources_list = json.loads(m.sources)
            except Exception:
                sources_list = None

        response_list.append(MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender=m.sender,
            content=m.content,
            sources=sources_list,
            created_at=m.created_at
        ))
    return response_list

@router.delete("/conversations/{conv_id}")
def delete_conversation(
    conv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    db.delete(conv)
    db.commit()
    return {"detail": "Conversation deleted successfully"}

@router.post("/send", response_model=MessageResponse)
def send_message(
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == req.conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    # 1. Save user message
    user_msg = Message(
        conversation_id=conv.id,
        sender="user",
        content=req.content
    )
    db.add(user_msg)
    db.commit()

    # Retrieve history for context
    history_msgs = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
    history_data = [{"sender": m.sender, "content": m.content} for m in history_msgs]

    # Update conversation title if first message
    if len(history_msgs) <= 2 and req.content:
        title_summary = req.content[:30] + "..." if len(req.content) > 30 else req.content
        conv.title = title_summary

    # 2. Call Gemini AI generator with mode and Java default instruction
    mode_to_use = req.mode or conv.mode or "study"
    ai_text = generate_study_chat_response(req.content, mode=mode_to_use, history=history_data)

    # 3. Save assistant message
    ai_msg = Message(
        conversation_id=conv.id,
        sender="assistant",
        content=ai_text
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return MessageResponse(
        id=ai_msg.id,
        conversation_id=ai_msg.conversation_id,
        sender=ai_msg.sender,
        content=ai_msg.content,
        sources=None,
        created_at=ai_msg.created_at
    )
