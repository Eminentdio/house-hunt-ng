import "@testing-library/jest-dom/vitest";

// jsdom lacks these browser APIs that Radix UI / our code touch
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null }),
});
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = RO;
(Element.prototype as any).scrollIntoView = () => {};
(Element.prototype as any).hasPointerCapture = () => false;
