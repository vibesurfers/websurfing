'use client'

import { useState } from 'react';
import { AppHeader } from '@/components/app-header';

export default function VideoPage() {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    window.location.href = 'https://meet.google.com/xtr-ixeo-muq';
  };

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Watch Demo
        </h1>

        <div
          className="relative cursor-pointer group"
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Screenshot */}
          <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-xl">
            {!imageError ? (
              <img
                src="/demo-screenshot.png"
                alt="VibeSurfing Demo"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">VibeSurfing Demo</p>
                  <p className="text-sm">Click to join video call</p>
                </div>
              </div>
            )}
          </div>

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                isHovered
                  ? 'bg-green-500 scale-110'
                  : 'bg-blue-500 scale-100'
              } shadow-2xl`}
            >
              <svg
                className="w-12 h-12 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
