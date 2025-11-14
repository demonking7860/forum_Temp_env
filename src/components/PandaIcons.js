// src/components/PandaIcons.js
import React from 'react';
import './PandaIcons.css'; // 👈 We'll add animation here

export const PandaEyesClosed = () => (
  <svg className="panda-icon" width="24" height="24" viewBox="0 0 64 64" fill="none">
    {/* Face */}
    <circle cx="32" cy="32" r="28" fill="#fff" stroke="#000" strokeWidth="2" />
    {/* Ears */}
    <circle cx="16" cy="12" r="6" fill="#000" />
    <circle cx="48" cy="12" r="6" fill="#000" />
    {/* Closed Eyes */}
    <path d="M22 30 q5 -6 10 0" stroke="#000" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M42 30 q-5 -6 -10 0" stroke="#000" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Nose */}
    <ellipse cx="32" cy="38" rx="4" ry="3" fill="#000" />
    {/* Mouth */}
    <path d="M28 44 q4 4 8 0" stroke="#000" strokeWidth="2" fill="none" />
    {/* Blush */}
    <circle cx="20" cy="38" r="2" fill="#fbb6ce" />
    <circle cx="44" cy="38" r="2" fill="#fbb6ce" />
  </svg>
);

export const PandaEyesOpen = () => (
  <svg className="panda-icon blink" width="24" height="24" viewBox="0 0 64 64" fill="none">
    {/* Face */}
    <circle cx="32" cy="32" r="28" fill="#fff" stroke="#000" strokeWidth="2" />
    {/* Ears */}
    <circle cx="16" cy="12" r="6" fill="#000" />
    <circle cx="48" cy="12" r="6" fill="#000" />
    {/* Eye patches */}
    <ellipse cx="22" cy="28" rx="6" ry="8" fill="#000" />
    <ellipse cx="42" cy="28" rx="6" ry="8" fill="#000" />
    {/* Pupils */}
    <circle cx="22" cy="28" r="2" fill="#fff" />
    <circle cx="42" cy="28" r="2" fill="#fff" />
    <circle cx="22" cy="28" r="0.6" fill="#000" />
    <circle cx="42" cy="28" r="0.6" fill="#000" />
    {/* Nose */}
    <ellipse cx="32" cy="38" rx="4" ry="3" fill="#000" />
    {/* Mouth */}
    <path d="M28 44 q4 4 8 0" stroke="#000" strokeWidth="2" fill="none" />
    {/* Blush */}
    <circle cx="20" cy="38" r="2" fill="#fbb6ce" />
    <circle cx="44" cy="38" r="2" fill="#fbb6ce" />
  </svg>
);
