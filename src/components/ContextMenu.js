'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

function ContextMenu({ options, position, onClose }) {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState(position);

  useEffect(() => {
    console.log('[ContextMenu] mount');
    return () => console.log('[ContextMenu] unmount');
  }, []);

  useEffect(() => {
    console.log('[ContextMenu] position prop', position);
  }, [position]);

  useEffect(() => {
    console.log('[ContextMenu] coords state', coords);
  }, [coords]);

  const computePosition = useCallback((desiredX, desiredY, menuWidth, menuHeight) => {
    const padding = 12;
    let x = desiredX ?? 0;
    let y = desiredY ?? 0;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : menuWidth + padding * 2;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : menuHeight + padding * 2;

    if (menuWidth) {
      if (x + menuWidth > viewportWidth - padding) {
        x = Math.max(padding, viewportWidth - menuWidth - padding);
      }
      if (x < padding) {
        x = padding;
      }
    } else if (x < padding) {
      x = padding;
    }

    if (menuHeight) {
      if (y + menuHeight > viewportHeight - padding) {
        y = Math.max(padding, viewportHeight - menuHeight - padding);
      }
      if (y < padding) {
        y = padding;
      }
    } else if (y < padding) {
      y = padding;
    }

    return { x, y };
  }, []);

  useLayoutEffect(() => {
    if (!menuRef.current || !position) return;

    setCoords((prev) => {
      const rect = menuRef.current.getBoundingClientRect();
      const anchor = position.anchorRect;
      const placement = position.placement || 'right';
      const verticalAlign = position.verticalAlign || 'top';
      const horizontalAlign = position.horizontalAlign || 'left';
      const offset = position.offset ?? 8;
      const offsetY = position.offsetY ?? 0;

      let desiredX = position.x ?? prev?.x ?? 0;
      let desiredY = position.y ?? prev?.y ?? 0;

      if (anchor) {
        if (placement === 'left') {
          desiredX = anchor.left - rect.width - offset;
        } else if (placement === 'right') {
          desiredX = anchor.right + offset;
        } else if (placement === 'top') {
          desiredX = anchor.left;
          desiredY = anchor.top - rect.height - offset;
        } else if (placement === 'bottom') {
          desiredX = anchor.left;
          desiredY = anchor.bottom + offset;
        }

        if (placement === 'left' || placement === 'right') {
          if (verticalAlign === 'center') {
            desiredY = anchor.top + (anchor.height - rect.height) / 2;
          } else if (verticalAlign === 'bottom') {
            desiredY = anchor.bottom - rect.height;
          } else {
            desiredY = anchor.top;
          }
        }

        if (placement === 'top' || placement === 'bottom') {
          if (horizontalAlign === 'center') {
            desiredX = anchor.left + (anchor.width - rect.width) / 2;
          } else if (horizontalAlign === 'right') {
            desiredX = anchor.right - rect.width;
          }
        }

        desiredY += offsetY;
      } else {
        desiredY += offsetY;
      }

      const adjusted = computePosition(desiredX, desiredY, rect.width, rect.height);
      if (adjusted.x === prev?.x && adjusted.y === prev?.y) {
        return prev;
      }
      return adjusted;
    });
  }, [position, computePosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#3e424b] rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[10rem]"
      style={{ top: coords?.y ?? 0, left: coords?.x ?? 0 }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => {
            option.action();
            onClose();
          }}
          className="text-white text-left text-sm px-3 py-1 rounded-md hover:bg-[#25edda] hover:text-black transition-colors"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ContextMenu;