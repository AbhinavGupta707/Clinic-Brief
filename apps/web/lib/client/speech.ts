"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrowserSpeechCapability } from "@clinicbrief/types";

type ClinicSpeechRecognitionConstructor = new () => ClinicSpeechRecognition;

type ClinicSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: ClinicSpeechRecognitionResultEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type ClinicSpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript?: string };
  }>;
};

type SpeechGlobal = {
  SpeechRecognition?: ClinicSpeechRecognitionConstructor;
  webkitSpeechRecognition?: ClinicSpeechRecognitionConstructor;
};

export function getBrowserSpeechCapability(): BrowserSpeechCapability {
  if (typeof window === "undefined") {
    return "unknown";
  }

  return getSpeechRecognitionConstructor() ? "supported" : "unsupported";
}

export function useBrowserSpeechToText({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [capability, setCapability] = useState<BrowserSpeechCapability>("unknown");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<ClinicSpeechRecognition | null>(null);
  const lastTranscriptRef = useRef("");
  const restartTimerRef = useRef<number | null>(null);
  const shouldListenRef = useRef(false);
  const seenTranscriptRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setCapability(getBrowserSpeechCapability());

    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);

    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      setCapability("unsupported");
      setError("Speech recognition is not available in this browser. Typed notes still work.");
      return;
    }

    shouldListenRef.current = true;
    lastTranscriptRef.current = "";
    seenTranscriptRef.current = new Set();

    const SpeechRecognitionConstructor = Recognition;

    function startRecognitionSession() {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = navigator.language || "en-GB";
      recognition.onresult = (event) => {
        const finalParts: string[] = [];

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];

          if (result?.isFinal) {
            finalParts.push(result[0]?.transcript ?? "");
          }
        }

        const transcript = finalParts.join(" ").replace(/\s+/g, " ").trim();
        const normalized = normalizeTranscript(transcript);

        if (!transcript || !normalized || seenTranscriptRef.current.has(normalized)) {
          return;
        }

        seenTranscriptRef.current.add(normalized);
        onTranscript(getTranscriptDelta(lastTranscriptRef.current, transcript));
        lastTranscriptRef.current = transcript;
      };
      recognition.onerror = (event) => {
        if (event.error === "no-speech" && shouldListenRef.current) {
          return;
        }

        shouldListenRef.current = false;
        setError(event.error ? `Speech recognition stopped: ${event.error}. Typed notes still work.` : "Speech recognition stopped. Typed notes still work.");
        setIsListening(false);
      };
      recognition.onend = () => {
        recognitionRef.current = null;

        if (!shouldListenRef.current) {
          setIsListening(false);
          return;
        }

        restartTimerRef.current = window.setTimeout(() => {
          if (shouldListenRef.current) {
            startRecognitionSession();
          }
        }, 250);
      };

      recognitionRef.current?.abort();
      recognitionRef.current = recognition;

      try {
        recognition.start();
        setCapability("supported");
        setIsListening(true);
      } catch {
        shouldListenRef.current = false;
        setIsListening(false);
        setError("Speech recognition could not start. Typed notes still work.");
      }
    }

    startRecognitionSession();
  }, [onTranscript]);

  return {
    capability,
    error,
    isListening,
    startListening,
    stopListening
  };
}

function normalizeTranscript(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

function getTranscriptDelta(previous: string, next: string): string {
  const cleanPrevious = previous.trim();
  const cleanNext = next.trim();

  if (!cleanPrevious) {
    return cleanNext;
  }

  if (cleanNext.toLowerCase().startsWith(cleanPrevious.toLowerCase())) {
    return cleanNext.slice(cleanPrevious.length).trim();
  }

  return cleanNext;
}

export function getBrowserTextToSpeechCapability(): BrowserSpeechCapability {
  if (typeof window === "undefined") {
    return "unknown";
  }

  return "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined" ? "supported" : "unsupported";
}

export function useBrowserTextToSpeech() {
  const [capability, setCapability] = useState<BrowserSpeechCapability>("unknown");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setCapability(getBrowserTextToSpeechCapability());

    return () => {
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const startSpeaking = useCallback((text: string) => {
    setError(null);

    if (getBrowserTextToSpeechCapability() !== "supported") {
      setCapability("unsupported");
      setError("Read-back is not available in this browser. The written story is still available.");
      return false;
    }

    const cleanText = text.trim();

    if (!cleanText) {
      setError("There is no story text to read back yet.");
      return false;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = navigator.language || "en-GB";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
      setError("Read-back stopped. The written story is still available.");
    };

    utteranceRef.current = utterance;
    setCapability("supported");
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
    return true;
  }, []);

  return {
    capability,
    error,
    isSpeaking,
    startSpeaking,
    stopSpeaking
  };
}

function getSpeechRecognitionConstructor(): ClinicSpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const speechGlobal = window as unknown as SpeechGlobal;
  return speechGlobal.SpeechRecognition ?? speechGlobal.webkitSpeechRecognition;
}
