"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

function speakWithFemaleVoice(text: string, done?: () => void) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    done?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(voice => /female|samantha|victoria|serena|aria|jenny|libby|susan|zira/i.test(voice.name) && /^en(-|_)/i.test(voice.lang))
    ?? voices.find(voice => /^en-GB/i.test(voice.lang))
    ?? voices.find(voice => /^en/i.test(voice.lang));
  if (preferred) utterance.voice = preferred;
  utterance.rate = 0.98;
  utterance.pitch = 1.08;
  utterance.onend = () => done?.();
  utterance.onerror = () => done?.();
  window.speechSynthesis.speak(utterance);
}

export default function AssistantLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const recognizerRef = useRef<Recognition | null>(null);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    setSupported(Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition));
    return () => {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function stopWakeWord() {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setWakeEnabled(false);
    setWakeStatus("Wake word is off.");
  }

  function enableWakeWord() {
    if (wakeEnabled) {
      stopWakeWord();
      return;
    }
    const speechWindow = window as SpeechWindow;
    const SpeechApi = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechApi) {
      setWakeStatus("Wake-word listening is not supported by this browser. Open the assistant and use its voice button instead.");
      return;
    }
    try {
      const recognizer = new SpeechApi();
      recognizer.lang = "en-GB";
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.onresult = event => {
        const transcript = Array.from(event.results).map(result => result[0]?.transcript ?? "").join(" ").toLowerCase();
        if (!/\bcrestovia\b|\bcrestovai\b/.test(transcript)) return;
        recognizer.stop();
        recognizerRef.current = null;
        setWakeEnabled(false);
        setWakeStatus("Wake word detected.");
        speakWithFemaleVoice("Yes, I’m here. How can I help you?", () => router.push("/dashboard/assistant?voice=1"));
      };
      recognizer.onerror = () => {
        setWakeEnabled(false);
        setWakeStatus("Wake-word listening stopped. Check microphone permission and enable it again.");
        recognizerRef.current = null;
      };
      recognizer.onend = () => {
        if (recognizerRef.current === recognizer) {
          recognizerRef.current = null;
          setWakeEnabled(false);
        }
      };
      recognizerRef.current = recognizer;
      recognizer.start();
      setWakeEnabled(true);
      setWakeStatus("Listening for “Crestovia”. Keep this dashboard tab open and allow microphone access.");
    } catch {
      setWakeStatus("Could not start wake-word listening. Allow microphone access for this site and try again.");
      setWakeEnabled(false);
    }
  }

  if (pathname === "/dashboard/assistant") return null;
  return (
    <aside className="assistant-global-launcher" aria-label="Crestovia personal assistant">
      <button type="button" className="assistant-launcher-open" onClick={() => router.push("/dashboard/assistant")} aria-label="Open Crestovia AI assistant">
        <span className="assistant-launcher-orb" aria-hidden="true"><span /></span>
        <span className="assistant-launcher-copy"><strong>Ask Crestovia</strong><small>Personal assistant</small></span>
        <span className="assistant-launcher-arrow" aria-hidden="true">↗</span>
      </button>
      {supported ? <button type="button" className="button button-secondary assistant-wake-toggle" onClick={enableWakeWord} aria-pressed={wakeEnabled}>{wakeEnabled ? "Turn off wake word" : "Enable “Crestovia” wake word"}</button> : null}
      {wakeStatus ? <small className="assistant-wake-status" role="status" aria-live="polite">{wakeStatus}</small> : null}
    </aside>
  );
}
