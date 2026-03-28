import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { completeAuthRedirect } from './authBootstrap';
import App from './App.tsx';
import { LiveResultsView } from './pages/LiveResultsView';
import { LiveByInviteRedirect } from './pages/LiveByInviteRedirect';
import './index.css';

async function mount() {
  await completeAuthRedirect();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/live/:tournamentId" element={<LiveResultsView />} />
          <Route path="/live" element={<LiveByInviteRedirect />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  );
}

void mount();
