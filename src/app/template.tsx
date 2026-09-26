"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

const EXIT_TRANSITION_MS = 970;
const ENTRY_TRANSITION_MS = 700;

export default function Template({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exiting, setExiting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setExiting(false);
    setReady(true);
    setOpening(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    document.body.classList.remove("p5-route-closing");
    if (openingTimer.current) clearTimeout(openingTimer.current);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      openingTimer.current = setTimeout(() => setOpening(false), ENTRY_TRANSITION_MS);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (openingTimer.current) clearTimeout(openingTimer.current);
      document.body.classList.remove("p5-route-closing");
    };
  }, [pathname]);

  useEffect(() => {
    const navigate = (href: string, replace = false, refresh = false) => {
      const destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const target = `${destination.pathname}${destination.search}${destination.hash}`;
      const commitNavigation = () => {
        if (replace) router.replace(target);
        else router.push(target);
        if (refresh) router.refresh();
      };
      if (exiting) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        commitNavigation();
        return;
      }
      setExiting(true);
      setOpening(false);
      document.body.classList.add("p5-route-closing");
      timer.current = setTimeout(commitNavigation, EXIT_TRANSITION_MS);
    };

    const transitionLink = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("data-no-transition")) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      event.preventDefault();
      navigate(`${destination.pathname}${destination.search}${destination.hash}`);
    };

    const transitionProgrammaticNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ href: string; replace?: boolean; refresh?: boolean }>).detail;
      if (detail?.href) navigate(detail.href, detail.replace, detail.refresh);
    };

    document.addEventListener("click", transitionLink, true);
    window.addEventListener("p5:navigate", transitionProgrammaticNavigation);
    return () => {
      document.removeEventListener("click", transitionLink, true);
      window.removeEventListener("p5:navigate", transitionProgrammaticNavigation);
    };
  }, [exiting, router]);

  return <>
    <div className={`p5-route-enter${ready ? "" : " p5-route-pending"}${exiting ? " p5-route-exit" : ""}`}>{children}</div>
    {(opening || exiting) && typeof document !== "undefined" ? createPortal(
      <div aria-hidden="true" className={`p5-route-curtain ${exiting ? "is-closing" : "is-opening"}`}>
        <i className="p5-curtain-main" />
        <i className="p5-curtain-dark" />
        <i className="p5-curtain-flash" />
        <i className="p5-curtain-tail" />
      </div>, document.body) : null}
  </>;
}
