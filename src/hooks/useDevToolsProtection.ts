import { useEffect, useRef } from "react";

export function useDevToolsProtection() {
  const debuggerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // ── 1. Disable right-click ──
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // ── 2. Disable dev tools keyboard shortcuts ──
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") { e.preventDefault(); return false; }
      // Ctrl+Shift+I / Cmd+Option+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) { e.preventDefault(); return false; }
      // Ctrl+Shift+J / Cmd+Option+J
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "J" || e.key === "j")) { e.preventDefault(); return false; }
      // Ctrl+Shift+C / Cmd+Option+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c")) { e.preventDefault(); return false; }
      // Ctrl+U / Cmd+U (View source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) { e.preventDefault(); return false; }
      // Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); return false; }
      // Ctrl+Shift+K (Firefox console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "K" || e.key === "k")) { e.preventDefault(); return false; }
      // Ctrl+Shift+M (Responsive mode)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "M" || e.key === "m")) { e.preventDefault(); return false; }
      // Ctrl+Shift+P (Command palette in devtools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p")) { e.preventDefault(); return false; }
    };

    // ── 3. Disable text selection & drag (except in inputs/textareas) ──
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    const handleDragStart = (e: DragEvent) => { e.preventDefault(); return false; };
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
      return false;
    };

    // ── 4. Debugger trap — only in production, not in preview/dev ──
    if (import.meta.env.PROD && !window.location.hostname.includes("lovable")) {
      debuggerIntervalRef.current = setInterval(() => {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const end = performance.now();
        if (end - start > 100) {
          document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0a0a0a;color:#ef4444;'><div style='text-align:center'><h1 style='font-size:2rem;margin-bottom:1rem'>⚠️ Access Denied</h1><p>Developer tools detected. This session has been terminated.</p></div></div>";
        }
      }, 2000);
    }

    // ── 5. Override console methods to prevent console inspection ──
    const noop = () => {};
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
      table: console.table,
      dir: console.dir,
    };

    if (import.meta.env.PROD) {
      console.log = noop;
      console.warn = noop;
      console.info = noop;
      console.debug = noop;
      console.table = noop;
      console.dir = noop;
    }

    // ── 6. Detect devtools via window size heuristic ──
    const checkDevToolsSize = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        // Devtools is likely docked — could log or redirect
      }
    };
    window.addEventListener("resize", checkDevToolsSize);

    // ── 7. Disable copy/cut of page content (allow in inputs) ──
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
    };
    const handleCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
    };

    // ── 8. Block print screen / print ──
    const handleBeforePrint = () => {
      document.body.style.display = "none";
    };
    const handleAfterPrint = () => {
      document.body.style.display = "";
    };

    // Add all listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      window.removeEventListener("resize", checkDevToolsSize);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      if (debuggerIntervalRef.current) clearInterval(debuggerIntervalRef.current);
      // Restore console
      if (import.meta.env.PROD) {
        Object.assign(console, originalConsole);
      }
    };
  }, []);
}
