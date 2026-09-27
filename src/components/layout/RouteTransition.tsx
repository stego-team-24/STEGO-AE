"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

const EXIT_TRANSITION_MS = 970;
const ENTRY_TRANSITION_MS = 700;

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPath = useRef(pathname);
  const transitionPending = useRef(false);
  const [exiting, setExiting] = useState(false);
  const [opening, setOpening] = useState(false);

  useLayoutEffect(() => {
    if (currentPath.current === pathname) return;
    currentPath.current = pathname;
    if (!transitionPending.current) return;

    transitionPending.current = false;
    if (timer.current) clearTimeout(timer.current);
    document.body.classList.remove("p5-route-closing");
    setExiting(false);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setOpening(!reducedMotion);
    if (openingTimer.current) clearTimeout(openingTimer.current);
    if (!reducedMotion) {
      openingTimer.current = setTimeout(() => setOpening(false), ENTRY_TRANSITION_MS);
    }
  }, [pathname]);

  useLayoutEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (openingTimer.current) clearTimeout(openingTimer.current);
    document.body.classList.remove("p5-route-closing");
  }, []);

  useLayoutEffect(() => {
    const navigate = (href: string, replace = false, refresh = false) => {
      const destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin || transitionPending.current) return;
      const target = `${destination.pathname}${destination.search}${destination.hash}`;
      const commitNavigation = () => {
        if (replace) router.replace(target);
        else router.push(target);
        if (refresh) router.refresh();
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        commitNavigation();
        return;
      }

      transitionPending.current = true;
      setExiting(true);
      setOpening(false);
      document.body.classList.add("p5-route-closing");
      timer.current = setTimeout(() => {
        if (destination.pathname === window.location.pathname) {
          if (replace) router.replace(target);
          else if (!refresh) router.push(target);
          if (refresh) router.refresh();
          transitionPending.current = false;
          document.body.classList.remove("p5-route-closing");
          setExiting(false);
          setOpening(true);
          openingTimer.current = setTimeout(() => setOpening(false), ENTRY_TRANSITION_MS);
          return;
        }
        commitNavigation();
      }, EXIT_TRANSITION_MS);
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
  }, [router]);

  return <>
    <div key={pathname} className={`p5-route-enter${exiting ? " p5-route-exit" : ""}`}>{children}</div>
    {(opening || exiting) && typeof document !== "undefined" ? createPortal(
      <div aria-hidden="true" className={`p5-route-curtain ${exiting ? "is-closing" : "is-opening"}`}>
        <i className="p5-curtain-main" />
        <i className="p5-curtain-dark" />
        <i className="p5-curtain-flash" />
        <i className="p5-curtain-tail" />
      </div>, document.body) : null}
  </>;
}
