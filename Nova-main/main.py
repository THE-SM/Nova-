from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import webbrowser
import musicLibrary
import os
import re
from groq import Groq
from dotenv import load_dotenv

# ---------------- LOAD ENV ---------------- #
load_dotenv()

app = FastAPI()

# ---------------- CORS ---------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NOTES_FILE = "Notes.txt"

# ---------------- GROQ SETUP ---------------- #
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("❌ GROQ_API_KEY not found. Check your .env file")

client = Groq(api_key=GROQ_API_KEY)


# ---------------- FORMAT RESPONSE ---------------- #
def format_response(text: str) -> str:
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > 200:
        text = text[:200] + "..."
    return text


# ---------------- GROQ FUNCTION ---------------- #
def ask_groq(query: str) -> str:
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are Nova, a smart AI assistant. Keep answers short, helpful, and natural."
                },
                {"role": "user", "content": query}
            ],
            temperature=0.7,
            max_tokens=200
        )

        return format_response(response.choices[0].message.content)

    except Exception:
        return "AI is currently unavailable. Please try again."


# ---------------- REQUEST MODEL ---------------- #
class Command(BaseModel):
    text: str


# ---------------- COMMAND PROCESSOR ---------------- #
def process_command(query: str) -> str:
    query = query.lower().strip()

    # --- OPEN WEBSITES --- #
    if "open google" in query:
        webbrowser.open("https://www.google.com")
        return "Opening Google"

    elif "open instagram" in query:
        webbrowser.open("https://www.instagram.com")
        return "Opening Instagram"

    elif "open whatsapp" in query:
        webbrowser.open("https://www.whatsapp.com")
        return "Opening WhatsApp"

    elif "open youtube" in query:
        webbrowser.open("https://www.youtube.com")
        return "Opening YouTube"

    elif "open linkedin" in query:
        webbrowser.open("https://www.linkedin.com")
        return "Opening LinkedIn"

    # --- PLAY MUSIC --- #
    elif query.startswith("play"):
        song_query = query.replace("play", "").strip()

        for key in musicLibrary.songs:
            if key in song_query:
                webbrowser.open(musicLibrary.songs[key])
                return f"Playing {key}"

        return "Song not found"

    # --- MEMORY SYSTEM --- #
    elif "remember" in query:
        message = query.replace("remember", "").replace("nova", "").strip()

        if message:
            with open(NOTES_FILE, "a") as file:
                file.write(message + "\n")
            return "Got it, I will remember that"

        return "What should I remember?"

    elif "what do you remember" in query:
        if os.path.exists(NOTES_FILE):
            with open(NOTES_FILE, "r") as file:
                content = file.read().strip()
                return content if content else "I don't remember anything yet"

        return "I don't remember anything yet"

    # --- AI FALLBACK --- #
    return ask_groq(query)


# ---------------- API ROUTE ---------------- #
@app.post("/command")
def command(cmd: Command):
    reply = process_command(cmd.text)
    return {"reply": reply}


# ---------------- SERVE FRONTEND ---------------- #
app.mount("/", StaticFiles(directory="static", html=True), name="static")