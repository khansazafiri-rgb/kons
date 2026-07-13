import React from 'react';

// Logo PCV: monogram serif di kotak maroon + wordmark.
// size: 'sm' (header) | 'md' (landing/login)
export default function Logo({ size = 'sm', light = false }) {
 const box = size === 'md' ? 'w-10 h-10 text-lg rounded-xl' : 'w-8 h-8 text-sm rounded-lg';
 const word = size === 'md' ? 'text-lg' : 'text-base';
 return (
   <span className="inline-flex items-center gap-2.5">
     <span className={`${box} ${light ? 'bg-alba-50 text-maroon-600' : 'bg-maroon-600 text-alba-50'} flex items-center justify-center font-display font-bold shadow-sm`}>
       P
     </span>
     <span className={`${word} font-display font-semibold tracking-tight ${light ? 'text-alba-50' : 'text-maroon-600'}`}>
       PCV <span className={light ? 'text-alba-200' : 'text-stone-800'}>Classroom</span>
     </span>
   </span>
 );
}
