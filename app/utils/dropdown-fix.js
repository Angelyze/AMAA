'use client';

import { useEffect } from 'react';

export function useDropdownFix() {
  useEffect(() => {
    // Fix for Select an AMAA dropdown
    const fixDropdowns = () => {
      const dropdownHeaders = document.querySelectorAll('.dropdown-header');
      
      dropdownHeaders.forEach(header => {
        // Skip elements that have the data-no-dropdown-fix attribute
        if (header.getAttribute('data-no-dropdown-fix') === 'true') {
          return;
        }
        
        // Find the closest dropdown wrapper
        const wrapper = header.closest('.dropdown-wrapper');
        if (!wrapper) return;
        
        // Find the dropdown list within this wrapper
        const dropdownList = wrapper.querySelector('.dropdown-list');
        if (!dropdownList) return;
        
        // Remove any existing listeners to prevent duplicates
        header.removeEventListener('click', toggleDropdown);
        
        // Add the click listener
        header.addEventListener('click', toggleDropdown);
        
        function toggleDropdown(e) {
          e.preventDefault();
          e.stopPropagation();
          dropdownList.classList.toggle('open');
          
          // Close when clicking outside
          const closeDropdown = (event) => {
            if (!wrapper.contains(event.target)) {
              dropdownList.classList.remove('open');
              document.removeEventListener('click', closeDropdown);
            }
          };
          
          if (dropdownList.classList.contains('open')) {
            // Add a slight delay to prevent immediate closing
            setTimeout(() => {
              document.addEventListener('click', closeDropdown);
            }, 10);
          }
        }
      });
    };
    
    // Run the fix on page load
    fixDropdowns();
    
    // Also run it again if the DOM changes (for dynamic content)
    const observer = new MutationObserver(fixDropdowns);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);
} 