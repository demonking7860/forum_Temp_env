// src/components/Spinner.js
import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 'small' }) => {
  const scale = size === 'medium' ? '30px' : '20px';

  return (
    <div
      className="spinner"
      style={{
        width: scale,
        height: scale,
        border: '3px solid rgba(0, 0, 0, 0.1)',
        borderTop: '3px solid var(--primary-color-dark)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
};

export default Spinner;
