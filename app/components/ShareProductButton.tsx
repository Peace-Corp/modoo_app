// 'use client'
import { Share } from 'lucide-react';
// import React from 'react';

interface ShareProductInterface {
  title?: string;
  // text: string;
  url: string;
}

export default function ShareProductButton({title = "모두의 유니폼", url}: ShareProductInterface) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || document.title,
          // text: text || 'Check out this link!',
          url: url || window.location.href,
        });
        console.log('Content shared successfully');
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that do not support the Web Share API
      alert('Web Share API is not supported in your browser. You can copy the link manually.');
      // Optional: implement a manual copy-to-clipboard fallback here
    }
  };
  return (
    <button onClick={handleShare} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50" title="공유">
      <Share className="size-4" />
    </button>
  )
}