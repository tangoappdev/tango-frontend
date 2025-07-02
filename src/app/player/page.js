// src/app/player/page.js
import React from 'react';
// Adjust the import path if you saved TangoPlayer.js elsewhere
import TangoPlayer from '../../components/TangoPlayer';

export default function PlayerPage() {
  return (
    <div>
      {/* You can add other page elements here if needed */}
      <TangoPlayer />
      {/* You could potentially pass initial settings or props here later */}
    </div>
  );
}
