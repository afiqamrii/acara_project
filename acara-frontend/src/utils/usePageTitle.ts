import { useEffect } from "react";

/**
 * Sets the document title for the current page.
 * Format: "Page — Acara"  (or just "Acara" if no title is provided)
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} - Acara` : "Acara";
  }, [title]);
}
