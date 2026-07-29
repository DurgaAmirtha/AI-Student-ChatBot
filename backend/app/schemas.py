from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=6)
    confirm_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    page_count: int
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class DocumentRenameRequest(BaseModel):
    new_filename: str

class DocumentChatRequest(BaseModel):
    question: str
    document_id: Optional[int] = None # None means search across all user notes

# --- Chat Schemas ---
class ConversationCreate(BaseModel):
    title: str = "New Study Session"
    mode: str = "study" # study, placement, interview

class ConversationResponse(BaseModel):
    id: int
    title: str
    mode: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    conversation_id: int
    content: str
    mode: Optional[str] = "study"

class SourceItem(BaseModel):
    document_name: str
    page: int

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender: str
    content: str
    sources: Optional[List[SourceItem]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Quiz Schemas ---
class QuizGenerateRequest(BaseModel):
    topic: Optional[str] = None
    document_id: Optional[int] = None
    difficulty: str = "Medium" # Easy, Medium, Hard
    num_questions: int = 5

class QuestionOption(BaseModel):
    key: str
    text: str

class QuizQuestionResponse(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    explanation: Optional[str] = None # Only revealed after submission if needed
    topic_tag: str

    class Config:
        from_attributes = True

class QuizResponse(BaseModel):
    id: int
    title: str
    topic: str
    difficulty: str
    created_at: datetime
    questions: List[QuizQuestionResponse]

    class Config:
        from_attributes = True

class QuizSubmissionAnswer(BaseModel):
    question_id: int
    selected_option: str # A, B, C, D

class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: List[QuizSubmissionAnswer]

class QuizQuestionResult(BaseModel):
    question_id: int
    question_text: str
    selected_option: str
    correct_option: str
    is_correct: bool
    explanation: str
    topic_tag: str

class QuizAttemptResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    quiz_title: str
    score: int
    total_questions: int
    score_percentage: float
    completed_at: datetime
    results: List[QuizQuestionResult]

# --- Analytics / Dashboard Schemas ---
class WeakTopicResponse(BaseModel):
    id: int
    topic_name: str
    total_questions: int
    incorrect_count: int
    accuracy_percentage: float

    class Config:
        from_attributes = True

class DashboardAnalyticsResponse(BaseModel):
    total_notes: int
    total_quizzes: int
    average_accuracy: float
    weak_topics: List[WeakTopicResponse]
    recommended_topics: List[str]
    recent_attempts: List[Any]
