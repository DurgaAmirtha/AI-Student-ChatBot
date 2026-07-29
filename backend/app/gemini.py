import json
import re
from typing import List, Dict, Any, Optional
from backend.app.config import settings

def call_gemini_text(prompt: str, system_instruction: str = "") -> str:
    """Call Google Gemini text generation model with fallback."""
    if not settings.GEMINI_API_KEY:
        return "Note: GEMINI_API_KEY environment variable is not configured. Please add your API key in .env file."

    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        
        # Try gemini-2.5-flash or gemini-1.5-flash or latest default model
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
        )
        return response.text if response and response.text else "No response generated."
    except Exception as e:
        # Fallback model attempt if primary model identifier varies
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=full_prompt,
            )
            return response.text if response and response.text else "No response generated."
        except Exception as err:
            return f"Error communicating with Gemini API: {str(err)}"

def generate_study_chat_response(query: str, mode: str = "study", history: List[Dict[str, str]] = None) -> str:
    """Generate Study Chat responses with mode conditioning and Java as default language."""
    base_instructions = (
        "You are an expert AI Student Assistant and Mentor. "
        "CRITICAL INSTRUCTION: Always use Java as the default programming language for coding solutions, examples, syntax, and data structures unless the user explicitly requests another language. "
        "Keep your explanations clear, structured, encouraging, and suitable for technical student placement preparation."
    )

    mode_instructions = {
        "study": (
            f"{base_instructions}\n"
            "Mode: Study Assistant. Focus on clear concept explanations, step-by-step breakdowns, Java code examples, and academic problem solving."
        ),
        "placement": (
            f"{base_instructions}\n"
            "Mode: Placement Preparation. Focus on Data Structures & Algorithms in Java, Core CS fundamentals (OS, DBMS, CN, OOPS), time complexity analysis, aptitude strategies, and common placement assessment questions."
        ),
        "interview": (
            f"{base_instructions}\n"
            "Mode: Interview Practice. Act as a technical interviewer. Conduct mock interviews, provide constructive feedback on answer structure (STAR method for HR, modular Java design for coding), and suggest improvements."
        )
    }

    sys_prompt = mode_instructions.get(mode, mode_instructions["study"])
    
    # Format chat context
    context_str = ""
    if history:
        context_str = "Conversation History:\n"
        for item in history[-6:]: # include last 6 turns
            context_str += f"{item.get('sender', 'user').capitalize()}: {item.get('content')}\n"
        context_str += "\n"

    final_prompt = f"{context_str}Student Question: {query}"
    return call_gemini_text(final_prompt, system_instruction=sys_prompt)

def generate_rag_response(query: str, relevant_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate RAG response grounded strictly in uploaded PDF notes with source citations."""
    if not relevant_chunks or max([c.get("similarity", 0) for c in relevant_chunks], default=0) < 0.15:
        return {
            "answer": "I cannot find the answer to this question in your uploaded notes. Please make sure the relevant PDF has been uploaded and processed.",
            "sources": []
        }

    context_text = ""
    sources = []
    seen_sources = set()

    for idx, chunk in enumerate(relevant_chunks):
        doc_name = chunk.get("filename", "Document")
        page_num = chunk.get("page_number", 1)
        src_key = f"{doc_name}-P{page_num}"
        if src_key not in seen_sources:
            seen_sources.add(src_key)
            sources.append({"document_name": doc_name, "page": page_num})

        context_text += f"\n--- [Source: {doc_name}, Page {page_num}] ---\n{chunk.get('content')}\n"

    sys_instruction = (
        "You are an AI Document Assistant. Your task is to answer the student's question STRICTLY based on the provided PDF context chunks below.\n"
        "RULES:\n"
        "1. Answer ONLY using facts directly mentioned in the context.\n"
        "2. Include page citations in your answer text, e.g. [Document: filename.pdf, Page X].\n"
        "3. If the context does not contain enough information to answer the question accurately, explicitly respond with: "
        "'I cannot find the answer to this question in your uploaded notes.'\n"
        "4. Do NOT use outside knowledge when answering document questions."
    )

    prompt = f"PDF Context Chunks:\n{context_text}\n\nStudent Question: {query}"
    answer_text = call_gemini_text(prompt, system_instruction=sys_instruction)

    return {
        "answer": answer_text,
        "sources": sources
    }

def generate_quiz_json(topic: str, difficulty: str = "Medium", context_text: Optional[str] = None, num_questions: int = 5) -> List[Dict[str, Any]]:
    """Generate structured MCQ quiz JSON from topic or document context."""
    source_desc = f"the provided PDF document context:\n{context_text[:3000]}" if context_text else f"the topic: '{topic}'"

    sys_instruction = (
        "You are a test generator for CS students. Generate multiple-choice questions (MCQs) in JSON format.\n"
        "Your response MUST be a valid JSON array of objects. Do not include markdown codeblock tags ```json or extra text outside the JSON array.\n"
        "Each object in the array must have the following keys:\n"
        "  - \"question_text\": string\n"
        "  - \"option_a\": string\n"
        "  - \"option_b\": string\n"
        "  - \"option_c\": string\n"
        "  - \"option_d\": string\n"
        "  - \"correct_option\": string (Must be exactly \"A\", \"B\", \"C\", or \"D\")\n"
        "  - \"explanation\": string\n"
        "  - \"topic_tag\": string\n"
    )

    prompt = (
        f"Generate {num_questions} {difficulty}-level multiple-choice questions based on {source_desc}.\n"
        f"Target difficulty: {difficulty}.\n"
        "Ensure questions are clear, technical, and accurate."
    )

    raw_response = call_gemini_text(prompt, system_instruction=sys_instruction)
    
    # Parse JSON output
    cleaned_json = raw_response.strip()
    if cleaned_json.startswith("```"):
        cleaned_json = re.sub(r"^```(?:json)?\n", "", cleaned_json)
        cleaned_json = re.sub(r"\n```$", "", cleaned_json)

    try:
        data = json.loads(cleaned_json)
        if isinstance(data, list) and len(data) > 0:
            return data
    except Exception as e:
        print(f"[Gemini Quiz] JSON parsing failed: {e}. Falling back to default generated questions.")

    # Fallback template questions if Gemini response is non-JSON or fails
    topic_clean = topic or "Computer Science Concepts"
    fallback_questions = [
        {
            "question_text": f"What is the primary characteristic of {topic_clean} in Data Structures / CS?",
            "option_a": "Efficient data storage and access",
            "option_b": "Linear memory allocation only",
            "option_c": "Exclusive use in database indexing",
            "option_d": "None of the above",
            "correct_option": "A",
            "explanation": f"{topic_clean} provides structured organization for efficient data manipulation and access.",
            "topic_tag": topic_clean
        },
        {
            "question_text": f"Which programming language is commonly used as default for technical placement algorithms?",
            "option_a": "JavaScript",
            "option_b": "Java",
            "option_c": "PHP",
            "option_d": "Ruby",
            "correct_option": "B",
            "explanation": "Java is widely preferred in campus placements due to strict typing, OOP principles, and rich collections library.",
            "topic_tag": "Java & DS"
        },
        {
            "question_text": f"What is the worst-case time complexity of standard Binary Search on a sorted array?",
            "option_a": "O(1)",
            "option_b": "O(N)",
            "option_c": "O(log N)",
            "option_d": "O(N log N)",
            "correct_option": "C",
            "explanation": "Binary search cuts the search space in half at each step, giving O(log N) worst-case time complexity.",
            "topic_tag": "Algorithms"
        }
    ]
    return fallback_questions[:num_questions]
