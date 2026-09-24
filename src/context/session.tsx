"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * In-memory session shared between image/audio pages. Never written to
 * localStorage — files and results are lost on refresh (PRD section 3).
 */

export interface MediaSession {
  cover: File | null;
  coverUrl: string | null;
  stego: File | null;
  stegoUrl: string | null;
  stegoName: string;
}

const EMPTY: MediaSession = {
  cover: null,
  coverUrl: null,
  stego: null,
  stegoUrl: null,
  stegoName: "stego.bin",
};

interface SessionContextValue {
  image: MediaSession;
  audio: MediaSession;
  setImageCover: (file: File) => void;
  setImageStego: (file: File) => void;
  setAudioCover: (file: File) => void;
  setAudioStego: (file: File) => void;
  resetImage: () => void;
  resetAudio: () => void;
  resetAll: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function makeSessionState(): MediaSession {
  return { ...EMPTY };
}

function createUrl(file: File | null, current: string | null): string | null {
  if (current) URL.revokeObjectURL(current);
  return file ? URL.createObjectURL(file) : null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<MediaSession>(makeSessionState);
  const [audio, setAudio] = useState<MediaSession>(makeSessionState);

  const setImageCover = useCallback((file: File) => {
    setImage((prev) => ({ ...prev, cover: file, coverUrl: createUrl(file, prev.coverUrl) }));
  }, []);

  const setImageStego = useCallback((file: File) => {
    setImage((prev) => ({ ...prev, stego: file, stegoUrl: createUrl(file, prev.stegoUrl), stegoName: file.name }));
  }, []);

  const setAudioCover = useCallback((file: File) => {
    setAudio((prev) => ({ ...prev, cover: file, coverUrl: createUrl(file, prev.coverUrl) }));
  }, []);

  const setAudioStego = useCallback((file: File) => {
    setAudio((prev) => ({ ...prev, stego: file, stegoUrl: createUrl(file, prev.stegoUrl), stegoName: file.name }));
  }, []);

  const resetImage = useCallback(() => {
    setImage((prev) => {
      if (prev.coverUrl) URL.revokeObjectURL(prev.coverUrl);
      if (prev.stegoUrl) URL.revokeObjectURL(prev.stegoUrl);
      return makeSessionState();
    });
  }, []);

  const resetAudio = useCallback(() => {
    setAudio((prev) => {
      if (prev.coverUrl) URL.revokeObjectURL(prev.coverUrl);
      if (prev.stegoUrl) URL.revokeObjectURL(prev.stegoUrl);
      return makeSessionState();
    });
  }, []);

  const resetAll = useCallback(() => {
    resetImage();
    resetAudio();
  }, [resetImage, resetAudio]);

  const value = useMemo(
    () => ({
      image,
      audio,
      setImageCover,
      setImageStego,
      setAudioCover,
      setAudioStego,
      resetImage,
      resetAudio,
      resetAll,
    }),
    [image, audio, setImageCover, setImageStego, setAudioCover, setAudioStego, resetImage, resetAudio, resetAll],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }
  return context;
}
