const chatBox = document.getElementById("chatBox");
const historyBox = document.getElementById("history");

let speakMode = true;
let isListening = false;
let recognition = null;

/* ---------------- ADD MESSAGE ---------------- */
function addMessage(text, type) {
    const div = document.createElement("div");
    div.className = `message ${type}`;
    div.innerHTML = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* ---------------- ADD HISTORY ---------------- */
function addHistory(text) {
    const item = document.createElement("div");
    item.className = "history-item";
    item.textContent = text;

    item.onclick = () => {
        document.getElementById("userInput").value = text;
    };

    historyBox.appendChild(item);
}

/* ---------------- SEND MESSAGE ---------------- */
async function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    addHistory(text);
    input.value = "";

    try {
        const res = await fetch("/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await res.json();
        addMessage(data.reply, "bot");

        speak(data.reply);

    } catch {
        addMessage("⚠️ Server error", "bot");
    }
}

/* ---------------- ENTER KEY ---------------- */
document.getElementById("userInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

/* ---------------- SPEAK ---------------- */
function speak(text) {
    if (!speakMode) return;

    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utter);
}

/* ---------------- TOGGLE SPEAK ---------------- */
function toggleSpeak() {
    const btn = document.getElementById("speakBtn");
    const icon = btn.querySelector("i");

    speakMode = !speakMode;

    if (speakMode) {
        btn.classList.remove("active");
        icon.className = "fa-solid fa-volume-high";
    } else {
        btn.classList.add("active");
        icon.className = "fa-solid fa-volume-xmark";
        speechSynthesis.cancel();
    }
}

/* ---------------- TOGGLE JARVIS ---------------- */
function toggleJarvis() {
    const btn = document.getElementById("jarvisBtn");

    if (isListening) {
        // TURN OFF
        isListening = false;

        if (recognition) {
            recognition.stop();
            recognition = null;
        }

        btn.classList.remove("active");
        speak("hands free mode off");

    } else {
        // TURN ON
        startJarvisMode();
        btn.classList.add("active");
    }
}

/* ---------------- START JARVIS ---------------- */
function startJarvisMode() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isListening = true;
        speak("hands free mode activated");
        console.log("🎤 Listening...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Heard:", transcript);

        // STOP COMMAND
        if (transcript.includes("stop listening")) {
            toggleJarvis();
            return;
        }

        // WAKE WORD REQUIRED
        if (!transcript.includes("nova")) return;

        speak("Yes");

        const command = transcript.replace("nova", "").trim();

        if (command) {
            sendVoiceCommand(command);
        }
    };

    recognition.onerror = (e) => {
        console.log("Speech error:", e);
    };

    recognition.onend = () => {
        if (isListening && recognition) {
            recognition.start(); // auto restart
        }
    };

    recognition.start();
}

/* ---------------- SEND VOICE COMMAND ---------------- */
function sendVoiceCommand(text) {
    addMessage(text, "user");

    fetch("/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
    .then(res => res.json())
    .then(data => {
        addMessage(data.reply, "bot");
        speak(data.reply);
    })
    .catch(() => {
        addMessage("⚠️ Voice command failed", "bot");
    });
}