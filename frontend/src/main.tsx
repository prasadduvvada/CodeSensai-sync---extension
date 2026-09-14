import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// UPDATE THIS LINE: Make sure the path matches your actual file exactly
import { DsaMentorWidget } from "./components/mockups/mockups/DsaMentorWidget";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="w-full min-h-screen bg-[#f0f4f8] flex justify-center items-start overflow-hidden">
      <DsaMentorWidget />
    </div>
  </React.StrictMode>
);