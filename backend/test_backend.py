import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.database import Base, engine

client = TestClient(app)

class TestFullStackBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    def test_auth_and_user_isolation(self):
        # 1. Register User A
        reg_a = client.post("/api/auth/register", json={
            "email": "userA@student.com",
            "full_name": "User A",
            "password": "password123",
            "confirm_password": "password123"
        })
        self.assertEqual(reg_a.status_code, 201)
        token_a = reg_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register User B
        reg_b = client.post("/api/auth/register", json={
            "email": "userB@student.com",
            "full_name": "User B",
            "password": "password123",
            "confirm_password": "password123"
        })
        self.assertEqual(reg_b.status_code, 201)
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User A creates a conversation
        conv_a = client.post("/api/chat/conversations", json={
            "title": "Java Multi-threading",
            "mode": "study"
        }, headers=headers_a)
        self.assertEqual(conv_a.status_code, 201)
        conv_a_id = conv_a.json()["id"]

        # 4. User B attempts to access User A's conversation -> MUST BE 404/Denied
        conv_b_try = client.get(f"/api/chat/conversations/{conv_a_id}/messages", headers=headers_b)
        self.assertEqual(conv_b_try.status_code, 404)

        # 5. User A generates quiz
        quiz_a = client.post("/api/quiz/generate", json={
            "topic": "Java Collections",
            "difficulty": "Medium",
            "num_questions": 3
        }, headers=headers_a)
        self.assertEqual(quiz_a.status_code, 200)
        quiz_data = quiz_a.json()
        quiz_id = quiz_data["id"]

        # 6. User A submits quiz
        answers = [{"question_id": q["id"], "selected_option": "A"} for q in quiz_data["questions"]]
        submit_a = client.post("/api/quiz/submit", json={
            "quiz_id": quiz_id,
            "answers": answers
        }, headers=headers_a)
        self.assertEqual(submit_a.status_code, 200)

        # 7. Check User B's quiz history -> MUST BE empty
        hist_b = client.get("/api/quiz/history", headers=headers_b)
        self.assertEqual(len(hist_b.json()), 0)

        # 8. Check User A's dashboard analytics
        analytics_a = client.get("/api/analytics/dashboard", headers=headers_a)
        self.assertEqual(analytics_a.status_code, 200)
        self.assertEqual(analytics_a.json()["total_quizzes"], 1)

if __name__ == "__main__":
    unittest.main()
