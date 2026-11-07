'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content Box */}
      <div className={`relative bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl w-full ${maxWidth} p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <h3 className="text-lg font-bold text-slate-900 font-['Montserrat']">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
