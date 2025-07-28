import React, { useEffect, useRef } from 'react';

// This is the component function
function ContextMenu({ options, position, onClose }) {
  const menuRef = useRef(null);

  // Effect to close the menu if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-20 bg-[#3e424b] rounded-md shadow-lg p-2 flex flex-col gap-1 -translate-x-full -translate-y-full min-w-[10rem]"
      style={{ top: position.y, left: position.x }}
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

// THIS LINE IS THE MOST IMPORTANT PART!
// It makes the component available to be imported in other files.
export default ContextMenu;