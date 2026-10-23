"use client";

import { useEffect, useRef, useState } from "react";
import { sendAssistantMessage } from "./actions";

type SpeechResult = { results: ArrayLike<{ 0: { transcript?: string }; isFinal?: boolean }> };
type SpeechRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognizer;
  webkitSpeechRecognition?: new () => SpeechRecognizer;
};

const speechLanguages = [
  { value: "auto", label: "Use browser language" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "ur-PK", label: "Urdu (Pakistan)" },
];

export default function AssistantComposer({ conversationId }: { conversationId: string }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState("auto");

  useEffect(() => () => {
    recognizerRef.current?.abort?.();
    recognizerRef.current = null;
  }, []);

  function toggleVoiceInput() {
    if (listening) {
      recognizerRef.current?.stop();
      setListening(false);
      setVoiceMessage("Voice input stopped. Review your transcript, then send when ready.");
      return;
    }
    const speechWindow = window as SpeechWindow;
    const SpeechApi = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechApi) {
      setVoiceMessage("Voice input is not supported in this browser. Try an up-to-date Chrome or Edge browser, or type your message.");
      return;
    }
    try {
      const recognizer = new SpeechApi();
      recognizer.lang = speechLanguage === "auto" ? (navigator.language || "en-US") : speechLanguage;
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 1;
      recognizer.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (inputRef.current && transcript) {
          inputRef.current.value = transcript;
          inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };
      recognizer.onerror = (event) => {
        const messages: Record<string, string> = {
          "not-allowed": "Microphone permission was denied. Allow microphone access for this site in your browser settings.",
          "no-speech": "No speech was detected. Check the selected microphone and speak in your usual voice, close enough for the mic to hear you.",
          "audio-capture": "No microphone was found. Connect or enable a microphone, then try again.",
          "network": "Browser speech recognition could not connect. Check your connection and try again.",
          "aborted": "Voice input was stopped."
        };
        setVoiceMessage(messages[event.error ?? ""] ?? "Voice input stopped. Check your microphone and browser permissions, then try again or type your message.");
        setListening(false);
      };
      recognizer.onend = () => {
        setListening(false);
        recognizerRef.current = null;
      };
      recognizerRef.current = recognizer;
      setVoiceMessage("Listening. Speak naturally at your normal volume. If recognition is poor, try selecting English (US/UK) or Urdu (Pakistan), move closer to the microphone, and reduce background noise. Your browser may ask for microphone permission.");
      setListening(true);
      recognizer.start();
    } catch {
      recognizerRef.current = null;
      setListening(false);
      setVoiceMessage("Could not start voice input. Check microphone permission and that another app is not exclusively using the microphone.");
    }
  }

  return (
    <form action={sendAssistantMessage} className="chat-composer">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <label htmlFor="assistant-message">Message</label>
      <textarea ref={inputRef} className="input chat-input" id="assistant-message" name="content" rows={3} maxLength={12000} required placeholder="Ask Crestovia AI…" />
      <div className="chat-compose-footer">
        <span className="muted">Workspace context is read-only. Company changes and external actions remain disabled.</span>
        <div className="chat-compose-actions">
          <label htmlFor="speech-language" className="muted">Speech language</label>
          <select
            className="input"
            id="speech-language"
            value={speechLanguage}
            onChange={(event) => setSpeechLanguage(event.target.value)}
            disabled={listening}
            aria-label="Speech recognition language"
          >
            {speechLanguages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
          </select>
          <button className="button button-secondary" type="button" onClick={toggleVoiceInput} aria-pressed={listening}>
            {listening ? "Stop listening" : "Use voice"}
          </button>
          <button className="button" type="submit">Send message</button>
        </div>
      </div>
      {voiceMessage ? <p className="muted" role="status" aria-live="polite">{voiceMessage}</p> : null}
      <p className="muted" style={{ fontSize: 12 }}>Voice recognition support and accuracy depend on your browser, operating system, microphone, and network. This page cannot directly change the microphone's hardware gain.</p>
    </form>
  );
}
