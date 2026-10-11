import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/standard-italic.css';
import App from './App';
import './styles.css';

if (window.location.hash === '#office') {
  window.location.replace('/workspace/#/office/intake');
} else if (/^#\/(office|worker|client|public)(\/|$)/.test(window.location.hash)) {
  window.location.replace('/workspace/' + window.location.search + window.location.hash);
} else {
  const element = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const root = document.getElementById('root');
  if (root.querySelector('main')) hydrateRoot(root, element);
  else createRoot(root).render(element);
}
