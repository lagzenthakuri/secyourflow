"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { ToastViewport, type ToastIntent, type ToastRecord } from "@/components/ui/ToastViewport";

export interface ToastInput {
  title: string;
  description?: string;
  intent?: ToastIntent;
  durationMs?: number;
}

export interface ConfirmInput {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: "danger" | "default";
}

export interface PromptInput {
  title: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  validate?: (value: string) => string | null;
}

interface UiFeedbackContextValue {
  showToast: (input: ToastInput) => void;
  confirm: (input: ConfirmInput) => Promise<boolean>;
  prompt: (input: PromptInput) => Promise<string | null>;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  intent: "danger" | "default";
  resolve: ((value: boolean) => void) | null;
}

interface PromptState {
  open: boolean;
  title: string;
  message: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  validate?: (value: string) => string | null;
  resolve: ((value: string | null) => void) | null;
}

const UiFeedbackContext = createContext<UiFeedbackContextValue | null>(null);

const defaultConfirmState: ConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  intent: "default",
  resolve: null,
};

const defaultPromptState: PromptState = {
  open: false,
  title: "",
  message: "",
  placeholder: "",
  confirmLabel: "Submit",
  cancelLabel: "Cancel",
  resolve: null,
};

export function useUiFeedback(): UiFeedbackContextValue {
  const context = useContext(UiFeedbackContext);
  if (!context) {
    throw new Error("useUiFeedback must be used within UiFeedbackProvider");
  }
  return context;
}

export function UiFeedbackProvider({ children }: { children: ReactNode }) {
  const nextToastIdRef = useRef(1);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(defaultConfirmState);
  const [promptState, setPromptState] = useState<PromptState>(defaultPromptState);

  const dismissToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, intent = "info", durationMs = 3500 }: ToastInput) => {
      const id = nextToastIdRef.current++;
      setToasts((previous) => [...previous, { id, title, description, intent }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast],
  );

  const confirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState((previous) => {
        if (previous.resolve) {
          previous.resolve(false);
        }

        return {
          open: true,
          title: input.title,
          message: input.message,
          confirmLabel: input.confirmLabel ?? "Confirm",
          cancelLabel: input.cancelLabel ?? "Cancel",
          intent: input.intent ?? "default",
          resolve,
        };
      });
    });
  }, []);

  const prompt = useCallback((input: PromptInput) => {
    return new Promise<string | null>((resolve) => {
      setPromptState((previous) => {
        if (previous.resolve) {
          previous.resolve(null);
        }

        return {
          open: true,
          title: input.title,
          message: input.message,
          placeholder: input.placeholder ?? "",
          confirmLabel: input.confirmLabel ?? "Submit",
          cancelLabel: input.cancelLabel ?? "Cancel",
          validate: input.validate,
          resolve,
        };
      });
    });
  }, []);

  const handleConfirm = () => {
    confirmState.resolve?.(true);
    setConfirmState(defaultConfirmState);
  };

  const handleConfirmCancel = () => {
    confirmState.resolve?.(false);
    setConfirmState(defaultConfirmState);
  };

  const handlePromptSubmit = (value: string) => {
    promptState.resolve?.(value);
    setPromptState(defaultPromptState);
  };

  const handlePromptCancel = () => {
    promptState.resolve?.(null);
    setPromptState(defaultPromptState);
  };

  const contextValue = useMemo<UiFeedbackContextValue>(
    () => ({
      showToast,
      confirm,
      prompt,
    }),
    [confirm, prompt, showToast],
  );

  return (
    <UiFeedbackContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        intent={confirmState.intent}
        onConfirm={handleConfirm}
        onCancel={handleConfirmCancel}
      />
      <PromptDialog
        isOpen={promptState.open}
        title={promptState.title}
        message={promptState.message}
        placeholder={promptState.placeholder}
        confirmLabel={promptState.confirmLabel}
        cancelLabel={promptState.cancelLabel}
        validate={promptState.validate}
        onSubmit={handlePromptSubmit}
        onCancel={handlePromptCancel}
      />
    </UiFeedbackContext.Provider>
  );
}
