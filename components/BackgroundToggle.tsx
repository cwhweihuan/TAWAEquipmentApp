"use client";

import { useSyncExternalStore } from "react";
import { FloatingCats } from "@/components/FloatingCats";

const storageKey = "tawa-background";
const changeEvent = "tawa-background-change";
let sessionPreference: boolean | undefined;

function readPreference() {
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}

function getSnapshot() {
  return sessionPreference ?? readPreference();
}

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function BackgroundToggle() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const label = enabled ? "Turn off background" : "Turn on background";

  function toggleBackground() {
    const next = !getSnapshot();
    try {
      window.localStorage.setItem(storageKey, next ? "on" : "off");
      sessionPreference = undefined;
    } catch {
      sessionPreference = next;
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  return (
    <>
      {enabled && <FloatingCats />}
      <button
        type="button"
        data-background-off={!enabled || undefined}
        onClick={toggleBackground}
        className="background-toggle fixed z-20 min-h-11 rounded-full border border-brand-300 bg-white px-4 text-xs font-semibold text-brand-700 shadow-lg hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      >
        {label}
      </button>
    </>
  );
}
