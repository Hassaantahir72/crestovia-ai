"use client";

import { useEffect, useState } from "react";

export default function SpeakReplyButton({ text, autoPlay = false }: { text: string; autoPlay?: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!autoPlay || !supported) return;
    const timer = window.setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 12000));
      utterance.lang = "en-GB";
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => /female|samantha|victoria|serena|aria|jenny|libby|susan|zira/i.test(voice.name) && /^en(-|_)/i.test(voice.lang))
        ?? voices.find(voice => /^en-GB/i.test(voice.lang))
        ?? voices.find(voice => /^en/i.test(voice.lang));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 0.98;
      utterance.pitch = 1.08;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      const url = new URL(window.location.href);
      url.searchParams.delete("voice_reply");
      window.history.replaceState({}, "", url.toString());
    }, 450);
    return () => window.clearTimeout(timer);
  }, [autoPlay, supported, text]);

  function toggleSpeech() {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 12000));
    utterance.lang = navigator.language || "en-US";
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  if (!supported) return null;
  return <button className="button button-secondary" type="button" onClick={toggleSpeech} aria-pressed={speaking}>{speaking ? "Stop speaking" : "Read aloud"}</button>;
}
