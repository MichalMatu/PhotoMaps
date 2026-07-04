let documentScrollLockCount = 0;
let documentScrollLockSnapshot: {
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
  scrollY: number;
} | null = null;

export function lockDocumentScroll() {
  documentScrollLockCount += 1;
  if (documentScrollLockCount > 1) {
    return;
  }

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const scrollY = window.scrollY;
  documentScrollLockSnapshot = {
    bodyOverflow: document.body.style.overflow,
    bodyPaddingRight: document.body.style.paddingRight,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyWidth: document.body.style.width,
    htmlOverflow: document.documentElement.style.overflow,
    scrollY,
  };

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function unlockDocumentScroll() {
  documentScrollLockCount = Math.max(0, documentScrollLockCount - 1);
  if (documentScrollLockCount > 0 || !documentScrollLockSnapshot) {
    return;
  }

  const snapshot = documentScrollLockSnapshot;
  documentScrollLockSnapshot = null;
  document.documentElement.style.overflow = snapshot.htmlOverflow;
  document.body.style.overflow = snapshot.bodyOverflow;
  document.body.style.paddingRight = snapshot.bodyPaddingRight;
  document.body.style.position = snapshot.bodyPosition;
  document.body.style.top = snapshot.bodyTop;
  document.body.style.width = snapshot.bodyWidth;
  window.scrollTo(0, snapshot.scrollY);
}
