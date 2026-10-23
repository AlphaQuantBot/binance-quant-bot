/**
 * Resilient clipboard utility designed for web apps and sandboxed iframe environments
 * Handles NotAllowedError / clipboard-write permission denials seamlessly with execCommand fallback.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Attempt 1: Modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or blocked in iframe sandbox, proceed to fallback
    }
  }

  // Attempt 2: Document execCommand fallback for iframes and restricted environments
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Ensure element is invisible and does not trigger scroll
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      textarea.style.zIndex = '-9999';
      
      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, 99999);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        return true;
      }
    } catch {
      // execCommand failed or not allowed
    }
  }

  // Safe fallback if neither succeeded (avoids unhandled rejections)
  return false;
}

/**
 * Fire-and-forget safe wrapper with optional success/error callbacks
 */
export function safeCopy(text: string, onSuccess?: () => void, onError?: () => void): void {
  copyToClipboard(text)
    .then((success) => {
      if (success) {
        onSuccess?.();
      } else {
        onError?.();
      }
    })
    .catch(() => {
      onError?.();
    });
}
