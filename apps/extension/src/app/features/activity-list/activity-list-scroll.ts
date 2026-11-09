const activityListScroll: { top?: number } = {};

export function saveActivityListScroll(top: number) {
  activityListScroll.top = top;
}

export function getActivityListScroll() {
  return activityListScroll.top;
}

export function clearActivityListScroll() {
  activityListScroll.top = undefined;
}

const maxRestoreFrames = 30;

export function restoreWindowScroll(top: number) {
  let frames = 0;
  function step() {
    window.scrollTo({ top });
    frames += 1;
    if (Math.abs(window.scrollY - top) < 1 || frames >= maxRestoreFrames) return;
    requestAnimationFrame(step);
  }
  step();
}
