from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User, Document, QuizAttempt, WeakTopic
from backend.app.schemas import DashboardAnalyticsResponse, WeakTopicResponse
from backend.app.auth import get_current_user

router = APIRouter()

@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict User Data Isolation
    total_notes = db.query(Document).filter(Document.user_id == current_user.id).count()

    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()
    total_quizzes = len(attempts)

    if attempts:
        avg_accuracy = sum(a.score_percentage for a in attempts) / total_quizzes
    else:
        avg_accuracy = 0.0

    # Fetch weak topics (< 75% accuracy or highest incorrect count)
    weak_topics_query = db.query(WeakTopic).filter(
        WeakTopic.user_id == current_user.id
    ).order_by(WeakTopic.accuracy_percentage.asc(), WeakTopic.incorrect_count.desc()).all()

    weak_topics_res = [WeakTopicResponse.model_validate(w) for w in weak_topics_query]

    # Generate recommended topics list
    recommended = [w.topic_name for w in weak_topics_query if w.accuracy_percentage < 75.0]
    if not recommended:
        recommended = ["Java Collections Framework", "Operating Systems - Memory Management", "SQL Joins & Indexing", "System Design Basics"]

    # Recent attempts list
    recent_attempts_data = []
    for att in sorted(attempts, key=lambda x: x.completed_at, reverse=True)[:5]:
        recent_attempts_data.append({
            "id": att.id,
            "quiz_id": att.quiz_id,
            "score": att.score,
            "total_questions": att.total_questions,
            "score_percentage": round(att.score_percentage, 1),
            "completed_at": att.completed_at.strftime("%Y-%m-%d %H:%M")
        })

    return DashboardAnalyticsResponse(
        total_notes=total_notes,
        total_quizzes=total_quizzes,
        average_accuracy=round(avg_accuracy, 1),
        weak_topics=weak_topics_res,
        recommended_topics=recommended[:5],
        recent_attempts=recent_attempts_data
    )
