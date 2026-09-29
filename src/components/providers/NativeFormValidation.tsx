"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FieldError } from "@repo/design-system/components/ui/field";

interface ValidationNotice {
  control: HTMLElement;
  host: HTMLElement;
  message: string;
}

function controlLabel(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const siblingLabel = control.parentElement?.querySelector(":scope > label")?.textContent?.trim();
  const label = control.labels?.[0]?.textContent?.trim()
    || siblingLabel
    || control.closest("label")?.textContent?.trim()
    || control.getAttribute("aria-label")
    || control.getAttribute("name")
    || control.getAttribute("placeholder");

  return label?.replace(/\s*\*\s*$/, "").trim();
}

function getValidationMessage(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const label = controlLabel(control);
  if (control.validity.valueMissing) {
    return label ? `${label} is required.` : "Complete this required field.";
  }
  if (control.validity.typeMismatch && control instanceof HTMLInputElement && control.type === "email") {
    return "Enter a valid email address.";
  }
  if (control.validity.tooShort) {
    return label ? `${label} is too short.` : "Enter more characters.";
  }
  if (control.validity.rangeUnderflow || control.validity.rangeOverflow || control.validity.stepMismatch) {
    return control.validationMessage;
  }
  return control.validity.typeMismatch
    ? label ? `Enter a valid ${label.toLowerCase()}.` : "Enter a valid value."
    : control.validationMessage;
}

/** Replaces browser validation bubbles with the shared shadcn field error.
 * Native constraints stay enabled so an unhydrated form cannot submit invalid data.
 */
export function NativeFormValidation() {
  const [notice, setNotice] = useState<ValidationNotice | null>(null);
  const noticePending = useRef(false);

  useEffect(() => {
    const handleInvalid = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
      event.preventDefault();
      if (noticePending.current) return;
      noticePending.current = true;
      const host = target.parentElement;
      if (!host) {
        noticePending.current = false;
        return;
      }

      setNotice({ control: target, host, message: getValidationMessage(target) });
      window.requestAnimationFrame(() => target.focus());
      window.setTimeout(() => { noticePending.current = false; }, 0);
    };

    const clearIfValid = (event: Event) => {
      const control = event.target;
      if (!notice || control !== notice.control) return;
      if (
        (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)
        && control.validity.valid
      ) {
        noticePending.current = false;
        setNotice(null);
      }
    };

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", clearIfValid, true);
    document.addEventListener("change", clearIfValid, true);
    return () => {
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("input", clearIfValid, true);
      document.removeEventListener("change", clearIfValid, true);
    };
  }, [notice]);

  useEffect(() => {
    if (!notice) return;
    const oldDescribedBy = notice.control.getAttribute("aria-describedby");
    const descriptionId = "native-validation-message";
    notice.control.setAttribute("aria-invalid", "true");
    notice.control.setAttribute("aria-describedby", [oldDescribedBy, descriptionId].filter(Boolean).join(" "));
    return () => {
      notice.control.removeAttribute("aria-invalid");
      if (oldDescribedBy) notice.control.setAttribute("aria-describedby", oldDescribedBy);
      else notice.control.removeAttribute("aria-describedby");
    };
  }, [notice]);

  if (!notice || !notice.host.isConnected) return null;
  return createPortal(
    <FieldError id="native-validation-message" className="mt-1 text-sm font-medium dark:text-destructive-foreground">
      {notice.message}
    </FieldError>,
    notice.host,
  );
}
