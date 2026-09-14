import React from "react";
// Adjust this import path if your file is nested differently (e.g., './components/mockups/DsaMentorWidget')
import DsaMentorWidget from "./components/DsaMentorWidget";

export default function App() {
  return (
    <div className="w-full min-h-screen bg-[#f0f4f8] flex justify-center items-start overflow-hidden">
      <DsaMentorWidget />
    </div>
  );
}