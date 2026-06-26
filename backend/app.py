from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import your modular AI scripts
from mindful_nlp import analyze_journal
from mindful_ml import generate_personalized_insight

# Initialize the API
app = FastAPI(title="MindfulMomentum Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Define the format for incoming React Native data
class JournalEntry(BaseModel):
    text: str

# --- ENDPOINT 1: NLP Sentiment & Theme Analysis ---
@app.post("/api/analyze-journal")
def process_journal(entry: JournalEntry):
    result = analyze_journal(entry.text)
    return {
        "status": "success",
        "calculated_mood_score": result["calculated_mood_score"],
        "overall_themes": result["overall_themes"],
        "paragraph_breakdown": result["paragraph_breakdown"]
    }

# --- ENDPOINT 2: ML Insight Generation ---
@app.get("/api/get-insight/{user_id}")
def process_insight(user_id: str):
    """
    React Native calls: GET /api/get-insight/p01
    API runs the ML pipeline and returns the personalized insight string.
    """
    result = generate_personalized_insight(user_id)
    
    if "error" in result:
        return {"status": "error", "message": result.get("message") or result["error"]}
        
    return {
        "status": "success",
        "data": result
    }

# This runs the server when you execute this file
if __name__ == "__main__":
    print("Starting MindfulMomentum Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)