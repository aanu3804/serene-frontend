import React, { useState, useEffect, useRef } from "react";
import "./ChatApp.css";

const ChatApp = () => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        setAudio(null);
      }
    };
  }, [audio]);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
  
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
  
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript); // Just update input box
      setRecording(false);
    };
    
  
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setMessages((prev) => [
        ...prev,
        { text: `You said: "${transcript}"`, sender: "bot", isTranscript: true }
      ]);
      setIsLoading(false);
    };
  
    recognitionRef.current = recognition;
  }, []);
  

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    setIsLoading(true);
    setMessages((prev) => [...prev, { text: userInput, sender: "user" }]);

    try {
      const response = await fetch("http://localhost:5000/chat/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const botMessages = data.lines.map((line) => ({
        text: line,
        sender: "bot",
        isExercise: line.split(" ").length > 20,
      }));
      setMessages((prev) => [...prev, ...botMessages]);

      if (data.audio) {
        playTTS(data.audio);
      }
    } catch (error) {
      console.error("Backend error:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Sorry, I couldn’t reach the server. Try again?", sender: "bot" },
      ]);
    }

    setUserInput("");
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading) sendMessage();
  };

  

  

  const toggleRecording = () => {
    if (!recording) {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setRecording(true);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setRecording(false);
      }
    }
  };
  

  const playTTS = (audioFilename) => {
    if (!audioFilename) {
      setMessages((prev) => [
        ...prev,
        { text: "Sorry, couldn’t generate audio for this response.", sender: "bot" },
      ]);
      return;
    }
  
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  
    const newAudio = new Audio(`http://localhost:5000/audio/${audioFilename}`);
    
    newAudio.onended = () => setAudio(null); // optional cleanup
    newAudio.play()
      .then(() => {
        setAudio(newAudio);
      })
      .catch((err) => {
        console.error("Audio playback error:", err);
        setMessages((prev) => [
          ...prev,
          { text: "Couldn’t play audio. Check your browser’s audio settings.", sender: "bot" },
        ]);
      });
  };
  

  const stopTTS = () => {
    if (audio) {
      audio.pause();
      setAudio(null);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">Serene - Your Emotional Support Chatbot</header>
      <div className="chat-box" ref={chatBoxRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.sender === "user" ? "user-message" : "bot-message"} ${
              msg.isTranscript ? "transcript" : ""
            }`}
          >
            <div>{msg.text}</div>
          </div>
        ))}
        {isLoading && <div className="loading">Thinking...</div>}
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          placeholder="Type your message..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          autoFocus
        />
        <button onClick={sendMessage} disabled={isLoading}>
          ➤
        </button>
        <button
          className={`mic-button ${recording ? "recording" : ""}`}
          onClick={toggleRecording}
          title={recording ? "Stop Recording" : "Start Recording"}
          disabled={isLoading}
        >
          {recording ? "🛑" : "🎤"}
        </button>
        {audio && (
          <button onClick={stopTTS} title="Stop Audio">
            ⏹️
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatApp;