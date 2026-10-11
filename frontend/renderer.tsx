import { Fragment } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import parse from 'html-react-parser';
import { Login, type SignIn } from './login';

// Existing templates and delegated handlers remain while screens move to TSX.
// Parsing creates React elements; markup must come from escaped app templates.
export function WorkspaceView({ markup }: { markup: string }) {
  return <>{parse(markup)}</>;
}

export function createWorkspaceRenderer(app: HTMLElement, modal: HTMLElement) {
  const appRoot = createRoot(app);
  let modalRoot: Root | undefined;
  let revision = 0;
  return {
    render(markup: string) {
      // Legacy widgets mutate their own DOM. Remount after their explicit cleanup.
      flushSync(() => appRoot.render(<WorkspaceView key={++revision} markup={markup} />));
    },
    renderLogin(onSignIn: SignIn) {
      flushSync(() => appRoot.render(<Login key={++revision} onSignIn={onSignIn} />));
    },
    renderModal(markup: string) {
      modalRoot ||= createRoot(modal);
      flushSync(() => modalRoot!.render(<Fragment key={++revision}><WorkspaceView markup={markup} /></Fragment>));
    },
    unmount() {
      appRoot.unmount();
      modalRoot?.unmount();
    }
  };
}

declare global {
  interface Window { OCD_REACT: ReturnType<typeof createWorkspaceRenderer> }
}

const app = document.getElementById('app');
const modal = document.getElementById('modal');
if (!app || !modal) throw new Error('Workspace mount elements are missing.');
window.OCD_REACT = createWorkspaceRenderer(app, modal);
