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

  useEffect(() => {
    setCapability(getBrowserSpeechCapability());

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
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

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? "";
      }

      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
    };
    recognition.onerror = (event) => {
      setError(event.error ? `Speech recognition stopped: ${event.error}. Typed notes still work.` : "Speech recognition stopped. Typed notes still work.");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current?.abort();
    recognitionRef.current = recognition;
    recognition.start();
    setCapability("supported");
    setIsListening(true);
  }, [onTranscript]);

  return {
    capability,
    error,
    isListening,
    startListening,
    stopListening
  };
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
