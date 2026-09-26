export function navigateWithTransition(href: string, options: { replace?: boolean; refresh?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent("p5:navigate", {
    detail: { href, replace: options.replace ?? false, refresh: options.refresh ?? false },
  }));
}
