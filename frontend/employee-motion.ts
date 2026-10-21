// Keep employee transitions brief and scoped; never wait for them before updating state.
const running = new WeakMap<HTMLElement, Animation>();
export function animateEmployeeSwitch(container: ParentNode) {
  const main = container.querySelector<HTMLElement>('.employee-main');
  if (!main) return;
  const previous = running.get(main);
  previous?.cancel();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !main.animate) return;
  const animation = main.animate(
    [
      { opacity: 0.82, transform: 'translateY(3px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 160, easing: 'cubic-bezier(.2, .8, .2, 1)' },
  );
  running.set(main, animation);
}

// Pagination and local panel switches update without remounting the workspace renderer.
document.addEventListener(
  'click',
  (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest<HTMLButtonElement>(
      '.employee-main .portal-list-pagination button, .employee-main .feedback-review-pagination button, .employee-main .section-navigation button, .employee-main .map-detail-tabs button, .employee-main .map-view-toggle button, .employee-main [role=tablist] button',
    );
    if (!control || control.disabled) return;
    requestAnimationFrame(() => animateEmployeeSwitch(document));
  },
  { capture: true },
);
