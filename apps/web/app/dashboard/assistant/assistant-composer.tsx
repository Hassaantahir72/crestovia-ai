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
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState("auto");
  const [micCheckActive, setMicCheckActive] = useState(false);
  const [micCheckStarting, setMicCheckStarting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  function stopMicrophoneCheck(updateState = true) {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
    if (updateState) {
      setMicCheckActive(false);
      setMicLevel(0);
    }
  }

  useEffect(() => () => {
    recognizerRef.current?.abort?.();
    recognizerRef.current = null;
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close().catch(() => undefined);
    }
    audioContextRef.current = null;
  }, []);

  async function toggleMicrophoneCheck() {
    if (micCheckActive) {
      stopMicrophoneCheck();
      setVoiceMessage("Microphone check stopped. If the signal stayed very low, check Windows microphone input volume and the selected default input device.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !("AudioContext" in window)) {
      setVoiceMessage("Microphone level checking is not supported in this browser. Try a current version of Chrome or Edge and check Windows microphone settings.");
      return;
    }
    setMicCheckStarting(true);
    try {
      setVoiceMessage("Allow microphone access, then speak at your normal volume for a few seconds.");
      const context = new AudioContext();
      audioContextRef.current = context;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let frameCount = 0;
      setMicCheckActive(true);

      const measureLevel = () => {
        if (!micStreamRef.current) return;
        analyser.getFloatTimeDomainData(samples);
        frameCount += 1;
        if (frameCount % 6 === 0) {
          const sumSquares = samples.reduce((sum, sample) => sum + sample * sample, 0);
          const rms = Math.sqrt(sumSquares / samples.length);
          setMicLevel(Math.min(100, Math.round(rms * 500)));
        }
        animationFrameRef.current = window.requestAnimationFrame(measureLevel);
      };
      animationFrameRef.current = window.requestAnimationFrame(measureLevel);
      setVoiceMessage("Microphone check is running. Speak naturally; the meter shows the signal reaching your browser. This check cannot change Windows microphone gain.");
    } catch (error) {
      stopMicrophoneCheck();
      setMicCheckActive(false);
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setVoiceMessage("Microphone access was blocked. Allow microphone permission for this site and in Windows Settings > Privacy & security > Microphone.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setVoiceMessage("No microphone was found. Connect or enable a microphone, then select it as the Windows default input device.");
      } else {
        setVoiceMessage("Could not check the microphone. Confirm that it is connected, enabled in Windows, and not blocked by another app.");
      }
    } finally {
      setMicCheckStarting(false);
    }
  }

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
          "no-speech": "No speech was detected. Run Check mic level to confirm the signal, check the selected Windows microphone, and speak at your usual volume.",
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
      setVoiceMessage("Listening. Speak naturally at your normal volume. If recognition is poor, check the microphone signal, choose English (US/UK) or Urdu (Pakistan), and reduce background noise.");
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
        <span className="muted">Speak your request, review the transcript, then send it. Task actions are limited by your workspace permissions.</span>
        <div className="chat-compose-actions">
          <label htmlFor="speech-language" className="muted">Speech language</label>
          <select
            className="input"
            id="speech-language"
            value={speechLanguage}
            onChange={(event) => setSpeechLanguage(event.target.value)}
            disabled={listening || micCheckActive}
            aria-label="Speech recognition language"
          >
            {speechLanguages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
          </select>
          <button className="button button-secondary" type="button" onClick={toggleMicrophoneCheck} disabled={listening || micCheckStarting} aria-pressed={micCheckActive}>
            {micCheckStarting ? "Starting mic check…" : micCheckActive ? "Stop mic check" : "Check mic level"}
          </button>
          <button className="button button-secondary" type="button" onClick={toggleVoiceInput} disabled={micCheckActive} aria-pressed={listening}>
            {listening ? "Stop listening" : "Speak message"}
          </button>
          <button className="button" type="submit">Send message</button>
        </div>
      </div>
      {micCheckActive ? (
        <div className="muted" role="status" aria-live="polite">
          <label htmlFor="mic-signal-level">Live microphone signal</label>
          <meter id="mic-signal-level" min={0} max={100} value={micLevel} style={{ display: "block", width: "100%", maxWidth: 360 }} />
          <p>{micLevel < 4 ? "Very little signal detected. Check Windows input volume, mute, and the selected default microphone." : micLevel < 15 ? "Signal detected. Speak at your normal volume and move closer to the microphone if recognition misses words." : "Good signal detected. Speech recognition accuracy can still depend on language, browser, network, and background noise."}</p>
        </div>
      ) : null}
      {voiceMessage ? <p className="muted" role="status" aria-live="polite">{voiceMessage}</p> : null}
      <p className="muted" style={{ fontSize: 12 }}>The mic check measures the default microphone signal but cannot change Windows input gain or guarantee browser speech-recognition accuracy. Stop the check before using voice input.</p>
    </form>
  );
}
