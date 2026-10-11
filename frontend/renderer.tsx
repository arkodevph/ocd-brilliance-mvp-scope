import { Fragment } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import parse, { Element, type HTMLReactParserOptions } from 'html-react-parser';
import { BookingMapView, BookingMapStats, BookingMapList, type BookingMapModel, type BookingMapOverview } from './booking-map';

// Native booking-map components share the existing portal and office layouts.
const parserOptions: HTMLReactParserOptions = {
  replace(node) {
    if (!(node instanceof Element)) return;
    if (node.attribs['data-react-booking-map']) {
      const model: BookingMapModel = JSON.parse(node.attribs['data-react-booking-map']);
      return <BookingMapView model={model} />;
    }
  },
};
export function WorkspaceView({ markup }: { markup: string }) {
  return <>{parse(markup, parserOptions)}</>;
}

export function createWorkspaceRenderer(app: HTMLElement, modal: HTMLElement) {
  const appRoot = createRoot(app);
  let modalRoot: Root | undefined;
  let revision = 0;
  const mapRoots = new Map<HTMLElement, Root>();
  const clearMapWidgets = () => {
    mapRoots.forEach(root => root.unmount());
    mapRoots.clear();
  };
  function widgetRoot(element: HTMLElement) {
    let root = mapRoots.get(element);
    if (!root) { root = createRoot(element); mapRoots.set(element, root); }
    return root;
  }
  return {
    clearMapWidgets,
    renderMapOverview(element: HTMLElement, overview: BookingMapOverview) {
      const stats = element.querySelector<HTMLElement>('[data-map-stats]');
      const list = element.querySelector<HTMLElement>('[data-map-list]');
      if (!stats || !list) return;
      flushSync(() => {
        widgetRoot(stats).render(<BookingMapStats overview={overview} />);
        widgetRoot(list).render(<BookingMapList bookings={overview.bookings} />);
      });
    },
    render(markup: string) {
      clearMapWidgets();
      // Legacy widgets mutate their own DOM. Remount after their explicit cleanup.
      flushSync(() => appRoot.render(<WorkspaceView key={++revision} markup={markup} />));
    },
    renderModal(markup: string) {
      modalRoot ||= createRoot(modal);
      flushSync(() =>
        modalRoot!.render(
          <Fragment key={++revision}>
            <WorkspaceView markup={markup} />
          </Fragment>,
        ),
      );
    },
    unmount() {
      clearMapWidgets();
      appRoot.unmount();
      modalRoot?.unmount();
    },
  };
}

declare global {
  interface Window {
    OCD_REACT: ReturnType<typeof createWorkspaceRenderer>;
  }
}

const app = document.getElementById('app');
const modal = document.getElementById('modal');
if (!app || !modal) throw new Error('Workspace mount elements are missing.');
window.OCD_REACT = createWorkspaceRenderer(app, modal);
