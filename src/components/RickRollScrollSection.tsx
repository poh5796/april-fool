'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScroll, motion, AnimatePresence, useMotionValueEvent } from 'framer-motion';

export default function RickRollScrollSection() {
  const [isStarted, setIsStarted] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Array to hold the preloaded HTMLImageElement instances
  const framesRef = useRef<HTMLImageElement[]>([]);
  // Keep track of the currently drawn frame to avoid redundant draws
  const currentFrameRef = useRef(-1);
  const totalFrames = 703;

  // Track the scroll position relative to the 400vh container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Function to draw a specific frame to the canvas
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Constrain index
    let safeIndex = Math.floor(index);
    if (safeIndex < 1) safeIndex = 1;
    if (safeIndex > totalFrames) safeIndex = totalFrames;

    const img = framesRef.current[safeIndex - 1];

    // Anti-Flash logic: only draw if image is fully loaded and complete.
    // We intentionally SKIP clearRect to avoid intermediate flashing of the background.
    if (!img || !img.complete) return;

    // Handle High-DPI displays for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Resize internal canvas resolution if CSS size changed
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    // Calculate aspect ratio calculations for object-cover
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = img.width / img.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    // Implement "object-cover" logic
    if (imageRatio > canvasRatio) {
      // Image is relatively wider than the canvas
      drawWidth = canvas.height * imageRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    } else {
      // Image is relatively taller than the canvas
      drawHeight = canvas.width / imageRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Update the ref so we know what frame is physically on the canvas
    currentFrameRef.current = safeIndex;
  };

  // Preload frames exactly once
  useEffect(() => {
    const frames: HTMLImageElement[] = [];

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      img.src = `/frames/${i}.jpg`;

      // Attempt to draw frame 1 as soon as it loads to give visual feedback before they click
      if (i === 1) {
        img.onload = () => {
          // If we haven't drawn anything yet, draw this first frame
          if (currentFrameRef.current === -1) {
            drawFrame(1);
          }
        };
      }
      frames.push(img);
    }

    framesRef.current = frames;

    // Handle resizing
    const handleResize = () => {
      // Re-draw the current frame so High-DPI logic kicks in again
      if (currentFrameRef.current > 0) {
        drawFrame(currentFrameRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependencies ensures we only preload once

  // React to framer-motion scroll updates
  useMotionValueEvent(scrollYProgress, 'change', latest => {
    if (!isStarted) return; // Don't animate frames until the user enters

    // latest is a value from 0 to 1
    // We map it to [1, 60] range
    const targetIndex = Math.floor(latest * (totalFrames - 1)) + 1;

    // Only draw if the target frame actually changed
    if (targetIndex !== currentFrameRef.current) {
      drawFrame(targetIndex);
    }
  });

  // Trigger popup after 5 seconds
  useEffect(() => {
    if (isStarted) {
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isStarted]);

  // Toggle body scroll locking based on state
  useEffect(() => {
    if (isStarted) {
      document.body.style.overflow = 'auto';
    } else {
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 0, behavior: 'instant' }); // Enforce top scroll
    }

    return () => {
      // Cleanup in case component unmounts
      document.body.style.overflow = 'auto';
    };
  }, [isStarted]);

  // Handle the action button click
  const handleStart = () => {
    setIsStarted(true);

    // Play the audio - since this is inside a user-initiated event handler,
    // the browser will unlock and allow audio playback.
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Audio playback failed:', err);
      });
    }

    // Attempt to manually draw the first frame just in case
    drawFrame(1);
  };

  return (
    <div className='relative bg-black h-full w-full'>
      {/* Hidden audio element */}
      <audio ref={audioRef} src='/rickroll-audio.mp3' preload='auto' loop />

      <AnimatePresence>
        {!isStarted && (
          <motion.div
            initial={{ opacity: 1, backdropFilter: 'blur(0px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(10px)', pointerEvents: 'none' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black'>
            <button onClick={handleStart} className='px-8 py-4 text-xl font-bold bg-white text-black rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95'>
              Click me!
            </button>
          </motion.div>
        )}
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className='fixed bottom-8 right-8 z-60 p-6 bg-white text-black rounded-2xl shadow-2xl max-w-sm border border-gray-200'>
            <button 
              onClick={() => setShowPopup(false)}
              className='absolute top-3 right-4 text-gray-400 hover:text-black font-bold text-xl'
            >
              &times;
            </button>
            <p className='text-lg font-medium mb-4 mt-2'>
              thank you for wasting 5 seconds of your life on this! Here's a gift for you!
            </p>
            <a 
              href='https://www.youtube.com/watch?v=dQw4w9WgXcQ' 
              target='_blank' 
              rel='noreferrer'
              className='inline-block px-5 py-2.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors'
            >
              Claim Gift
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Scroll Animation Container */}
      <div ref={containerRef} className='relative w-full h-[400vh]'>
        <div className='sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center pointer-events-none'>
          {/* Framer motion doesn't control the canvas directly, we just read the scroll from the parent */}
          <canvas ref={canvasRef} className='w-full h-full object-cover bg-black' />
        </div>
      </div>
    </div>
  );
}
