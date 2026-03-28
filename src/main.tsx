import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { completeAuthRedirect } from './authBootstrap';
import App from './App.tsx';
import './index.css';

async function mount() {
  await completeAuthRedirect();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void mount();
