from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.database import get_db
from backend.app.models import User, Document, DocumentChunk, Quiz, QuizQuestion, QuizAttempt, QuizAnswer, WeakTopic
from backend.app.schemas import (
    QuizGenerateRequest, QuizResponse, QuizQuestionResponse,
    QuizSubmitRequest, QuizAttemptResponse, QuizQuestionResult
)
from backend.app.auth import get_current_user
from backend.app.gemini import generate_quiz_json

router = APIRouter()

@router.post("/generate", response_model=QuizResponse)
def generate_quiz(
    req: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic_str = req.topic or "General CS Practice"
    context_text = None
    doc_id = None

    if req.document_id:
        doc = db.query(Document).filter(Document.id == req.document_id, Document.user_id == current_user.id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found or access denied")
        doc_id = doc.id
        topic_str = f"Notes: {doc.filename}"

        # Fetch sample chunks from document
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).limit(10).all()
        if chunks:
            context_text = "\n".join([c.content for c in chunks])

    # Call Gemini quiz JSON generator
    quiz_data_list = generate_quiz_json(
        topic=topic_str,
        difficulty=req.difficulty,
        context_text=context_text,
        num_questions=req.num_questions
    )

    # Save Quiz to DB
    quiz = Quiz(
        user_id=current_user.id,
        document_id=doc_id,
        title=f"{topic_str} ({req.difficulty})",
        topic=topic_str,
        difficulty=req.difficulty
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    question_responses = []
    for q_data in quiz_data_list:
        qq = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q_data.get("question_text", "Question"),
            option_a=q_data.get("option_a", "Option A"),
            option_b=q_data.get("option_b", "Option B"),
            option_c=q_data.get("option_c", "Option C"),
            option_d=q_data.get("option_d", "Option D"),
            correct_option=str(q_data.get("correct_option", "A")).upper().strip(),
            explanation=q_data.get("explanation", "Correct explanation"),
            topic_tag=q_data.get("topic_tag", topic_str)
        )
        db.add(qq)
        db.commit()
        db.refresh(qq)

        question_responses.append(QuizQuestionResponse(
            id=qq.id,
            question_text=qq.question_text,
            option_a=qq.option_a,
            option_b=qq.option_b,
            option_c=qq.option_c,
            option_d=qq.option_d,
            explanation=None, # hidden until submission
            topic_tag=qq.topic_tag
        ))

    return QuizResponse(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        created_at=quiz.created_at,
        questions=question_responses
    )

@router.post("/submit", response_model=QuizAttemptResponse)
def submit_quiz(
    req: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == req.quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found or access denied")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()

    correct_count = 0
    total_questions = len(questions)
    results = []

    # Map user answers cleanly
    user_answers_dict = {ans.question_id: ans.selected_option.upper().strip() for ans in req.answers}

    topic_stats = {} # topic_tag -> {total: int, incorrect: int}

    attempt_answers_to_save = []

    for q in questions:
        selected = user_answers_dict.get(q.id, "")
        is_corr = (selected == q.correct_option)
        if is_corr:
            correct_count += 1

        t_tag = q.topic_tag or quiz.topic or "General CS"
        if t_tag not in topic_stats:
            topic_stats[t_tag] = {"total": 0, "incorrect": 0}
        topic_stats[t_tag]["total"] += 1
        if not is_corr:
            topic_stats[t_tag]["incorrect"] += 1

        results.append(QuizQuestionResult(
            question_id=q.id,
            question_text=q.question_text,
            selected_option=selected,
            correct_option=q.correct_option,
            is_correct=is_corr,
            explanation=q.explanation,
            topic_tag=t_tag
        ))

        attempt_answers_to_save.append({
            "question_id": q.id,
            "selected_option": selected,
            "is_correct": 1 if is_corr else 0
        })

    score_pct = (correct_count / total_questions * 100.0) if total_questions > 0 else 0.0

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        score=correct_count,
        total_questions=total_questions,
        score_percentage=score_pct
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    for item in attempt_answers_to_save:
        qa = QuizAnswer(
            attempt_id=attempt.id,
            question_id=item["question_id"],
            selected_option=item["selected_option"],
            is_correct=item["is_correct"]
        )
        db.add(qa)

    # Update Weak Topics for current user
    for t_name, stat in topic_stats.items():
        wt = db.query(WeakTopic).filter(WeakTopic.user_id == current_user.id, WeakTopic.topic_name == t_name).first()
        if not wt:
            wt = WeakTopic(
                user_id=current_user.id,
                topic_name=t_name,
                total_questions=0,
                incorrect_count=0,
                accuracy_percentage=0.0
            )
            db.add(wt)

        wt.total_questions += stat["total"]
        wt.incorrect_count += stat["incorrect"]
        correct_t = wt.total_questions - wt.incorrect_count
        wt.accuracy_percentage = (correct_t / wt.total_questions * 100.0) if wt.total_questions > 0 else 100.0
        wt.last_updated = datetime.utcnow()

    db.commit()

    return QuizAttemptResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        score=correct_count,
        total_questions=total_questions,
        score_percentage=score_pct,
        completed_at=attempt.completed_at,
        results=results
    )

@router.get("/history", response_model=List[QuizAttemptResponse])
def get_quiz_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.completed_at.desc()).all()

    res = []
    for att in attempts:
        quiz = db.query(Quiz).filter(Quiz.id == att.quiz_id).first()
        q_title = quiz.title if quiz else "Quiz Practice"

        answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == att.id).all()
        q_results = []
        for ans in answers:
            qq = db.query(QuizQuestion).filter(QuizQuestion.id == ans.question_id).first()
            if qq:
                q_results.append(QuizQuestionResult(
                    question_id=qq.id,
                    question_text=qq.question_text,
                    selected_option=ans.selected_option,
                    correct_option=qq.correct_option,
                    is_correct=(ans.is_correct == 1),
                    explanation=qq.explanation,
                    topic_tag=qq.topic_tag
                ))

        res.append(QuizAttemptResponse(
            attempt_id=att.id,
            quiz_id=att.quiz_id,
            quiz_title=q_title,
            score=att.score,
            total_questions=att.total_questions,
            score_percentage=att.score_percentage,
            completed_at=att.completed_at,
            results=q_results
        ))
    return res
