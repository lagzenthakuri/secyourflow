"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import {
  type ToastIntent,
  type ToastRecord,
  ToastViewport,
} from "@/components/ui/ToastViewport";

export interface ToastInput {
  description?: string;
  durationMs?: number;
  intent?: ToastIntent;
  title: string;
}

export interface ConfirmInput {
  cancelLabel?: string;
  confirmLabel?: string;
  intent?: "danger" | "default";
  message: string;
  title: string;
}

export interface PromptInput {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  placeholder?: string;
  title: string;
  validate?: (value: string) => string | null;
}

interface UiFeedbackContextValue {
  confirm: (input: ConfirmInput) => Promise<boolean>;
  prompt: (input: PromptInput) => Promise<string | null>;
  showToast: (input: ToastInput) => void;
}

interface ConfirmState {
  cancelLabel: string;
  confirmLabel: string;
  intent: "danger" | "default";
  message: string;
  open: boolean;
  resolve: ((value: boolean) => void) | null;
  title: string;
}

interface PromptState {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  open: boolean;
  placeholder: string;
  resolve: ((value: string | null) => void) | null;
  title: string;
  validate?: (value: string) => string | null;
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
  const [confirmState, setConfirmState] =
    useState<ConfirmState>(defaultConfirmState);
  const [promptState, setPromptState] =
    useState<PromptState>(defaultPromptState);

  const dismissToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      title,
      description,
      intent = "info",
      durationMs = 3500,
    }: ToastInput) => {
      const id = nextToastIdRef.current++;
      setToasts((previous) => [
        ...previous,
        { id, title, description, intent },
      ]);

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast]
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
    [confirm, prompt, showToast]
  );

  return (
    <UiFeedbackContext.Provider value={contextValue}>
      {children}
      <ToastViewport onDismiss={dismissToast} toasts={toasts} />
      <ConfirmDialog
        cancelLabel={confirmState.cancelLabel}
        confirmLabel={confirmState.confirmLabel}
        intent={confirmState.intent}
        isOpen={confirmState.open}
        message={confirmState.message}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirm}
        title={confirmState.title}
      />
      <PromptDialog
        cancelLabel={promptState.cancelLabel}
        confirmLabel={promptState.confirmLabel}
        isOpen={promptState.open}
        message={promptState.message}
        onCancel={handlePromptCancel}
        onSubmit={handlePromptSubmit}
        placeholder={promptState.placeholder}
        title={promptState.title}
        validate={promptState.validate}
      />
    </UiFeedbackContext.Provider>
  );
}
