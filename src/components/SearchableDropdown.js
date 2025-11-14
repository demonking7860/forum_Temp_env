import React, { useState, useEffect, useRef } from "react";
import "./SearchableDropdown.css";

const SearchableDropdown = ({ 
  label, 
  options, 
  value, 
  onChange, 
  loading, 
  disabled = false,
  emptyLabel = "Select an option",
  placeholder = "Search...",
  includeEmptyOption = true,
  disabledOptions = [],
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const dropdownContentRef = useRef(null);
  const optionsContainerRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Update filtered options when options prop changes or search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = options.filter(option => {
        const optionStr = String(option);
        return optionStr.toLowerCase().includes(lowercasedSearch);
      });
      setFilteredOptions(filtered);
    }
  }, [options, searchTerm]);
  
  // Reset search when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // CRITICAL: Prevent body scroll when dropdown is open on mobile
  useEffect(() => {
    // Store original body style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const isMobile = window.innerWidth <= 768;
    
    if (isOpen && isMobile) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';
      
      // Explicitly handle touch events on the options container
      const optionsContainer = optionsContainerRef.current;
      if (optionsContainer) {
        const preventBodyScroll = (e) => {
          // Do not prevent default here as it will break scrolling
          // Just stop propagation to prevent body scrolling
          e.stopPropagation();
        };
        
        optionsContainer.addEventListener('touchmove', preventBodyScroll, { passive: false });
        
        return () => {
          document.body.style.overflow = originalStyle;
          optionsContainer.removeEventListener('touchmove', preventBodyScroll);
        };
      }
    }
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);
  
  // Position the dropdown content when it opens
  useEffect(() => {
    if (isOpen && dropdownContentRef.current) {
      // Add a class to the parent container when dropdown is open
      if (dropdownRef.current) {
        dropdownRef.current.classList.toggle('open', isOpen);
      }
      
      // Check if we're on mobile
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // On mobile, set up dropdown styles
        dropdownContentRef.current.style.position = 'fixed';
        dropdownContentRef.current.style.top = 'auto';
        dropdownContentRef.current.style.bottom = '0';
        dropdownContentRef.current.style.marginTop = '0';
        dropdownContentRef.current.style.left = '0';
        dropdownContentRef.current.style.right = '0';
        dropdownContentRef.current.style.width = '100%';
        dropdownContentRef.current.style.borderRadius = '18px 18px 0 0';
        dropdownContentRef.current.style.zIndex = '10000';
        
        // Initially hide dropdown until user types something and has results
        if (!searchTerm || filteredOptions.length === 0) {
          dropdownContentRef.current.style.display = 'none';
          dropdownContentRef.current.classList.remove('has-results');
        } else {
          dropdownContentRef.current.style.display = 'flex';
          dropdownContentRef.current.classList.add('has-results');
        }
        
        // Add click event to close dropdown when clicking on the overlay
        const handleOverlayClick = (e) => {
          if (e.target.classList.contains('dropdown-overlay')) {
            setIsOpen(false);
          }
        };
        
        document.addEventListener('click', handleOverlayClick);
        
        return () => {
          document.removeEventListener('click', handleOverlayClick);
        };
      } else {
        // On desktop, position the dropdown without affecting other content
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - dropdownRect.bottom;
        
        dropdownContentRef.current.style.position = 'absolute';
        
        // Check if there's less than 200px below the dropdown
        if (spaceBelow < 200) {
          // Position the dropdown above the header
          dropdownContentRef.current.style.top = 'auto';
          dropdownContentRef.current.style.bottom = '100%';
          dropdownContentRef.current.style.marginTop = '0';
          dropdownContentRef.current.style.marginBottom = '8px';
        } else {
          // Position the dropdown below the header (default behavior)
          dropdownContentRef.current.style.top = '100%';
          dropdownContentRef.current.style.bottom = 'auto';
          dropdownContentRef.current.style.marginTop = '8px';
          dropdownContentRef.current.style.marginBottom = '0';
        }
      }
    }
  }, [isOpen, searchTerm, filteredOptions.length]);

  // Get display value for the dropdown
  const getDisplayValue = () => {
    if (value) return String(value);
    return emptyLabel;
  };
  
  // Handle option selection
  const handleOptionClick = (option) => {
    // Don't allow clicking on disabled options
    if (disabledOptions.includes(option)) {
      return;
    }
    onChange({ target: { value: option } });
    setIsOpen(false);
    setSearchTerm("");
  };
  
  // Toggle dropdown - Fixed for mobile
  const toggleDropdown = () => {
    if (!loading && !disabled) {
      const isMobile = window.innerWidth <= 768;
      
      // Toggle open state
      setIsOpen(!isOpen);
      
      // For mobile devices
      if (isMobile) {
        // When opening the dropdown
        if (!isOpen) {
          // Short delay to ensure DOM is ready
          setTimeout(() => {
            if (dropdownContentRef.current) {
              // On mobile, initially hide dropdown content until search happens
              dropdownContentRef.current.style.display = 'none';
              
              // Focus on input after a short delay
              const input = dropdownContentRef.current.querySelector('input');
              if (input) {
                input.focus();
              }
            }
          }, 50);
        }
      }
    }
  };
  
  // Handle search input change - Complete rewrite for mobile search
  const handleSearchChange = (e) => {
    // Update the search term state
    setSearchTerm(e.target.value);
    
    const isMobile = window.innerWidth <= 768;
    const searchValue = e.target.value.toLowerCase().trim();
    
    // Filter options based on search term
    const filtered = options.filter(option => {
      const optionStr = String(option).toLowerCase();
      return optionStr.includes(searchValue);
    });
    
    // Update filtered options
    setFilteredOptions(filtered);
    
    // On mobile, handle visibility of dropdown based on search
    if (isMobile && dropdownContentRef.current) {
      if (searchValue && filtered.length > 0) {
        // Show dropdown when there's both a search term and results
        dropdownContentRef.current.style.display = 'flex';
        dropdownContentRef.current.classList.add('has-results');
      } else {
        // Hide dropdown when there's no search term or no results
        dropdownContentRef.current.style.display = 'none';
        dropdownContentRef.current.classList.remove('has-results');
      }
    }
  };

  // Modify the handleScroll function to allow touch scrolling
  const handleOptionsScroll = (e) => {
    // Don't prevent default scrolling behavior
    e.stopPropagation();
  };

  // Replace the preventTouchMove function with a more permissive version
  const handleTouchMove = (e) => {
    // Don't prevent default - this allows scrolling
    e.stopPropagation();
  };
  
  return (
    <>
      {/* Remove the overlay element completely */}
      
      <div className={`searchable-dropdown ${disabled ? 'disabled' : ''} ${isOpen ? 'active' : ''}`} style={style} ref={dropdownRef}>
        {label && <label className="dropdown-label">{label}</label>}
        <div 
          className={`dropdown-header ${isOpen ? 'active' : ''} ${loading || disabled ? 'disabled' : ''}`}
          onClick={toggleDropdown}
        >
          <span>{getDisplayValue()}</span>
          <div className="dropdown-icon">
            {loading ? (
              <div className="dropdown-spinner"></div>
            ) : (
              <span>{isOpen ? '▲' : '▼'}</span>
            )}
          </div>
        </div>
        
        {isOpen && !disabled && (
          <div 
            className={`dropdown-content ${searchTerm && filteredOptions.length > 0 ? 'has-results' : ''}`}
            ref={dropdownContentRef} 
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="search-container">
              <div className="drag-indicator"></div>
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={handleSearchChange}
                autoFocus
                className="search-input" 
                disabled={disabled}
              />
            </div>
            
            <div 
              className="options-container" 
              ref={optionsContainerRef}
              onTouchMove={handleTouchMove}
              onWheel={handleOptionsScroll}
              onScroll={(e) => e.stopPropagation()}
            >
              {includeEmptyOption && (
                <div className="option" onClick={() => handleOptionClick("")}>
                  {emptyLabel}
                </div>
              )}
              
              {filteredOptions.length > 0 ? (
                <>
                  {filteredOptions.map((option, index) => (
                    <div 
                      key={index} 
                      className={`option ${value === option ? 'selected' : ''} ${disabledOptions.includes(option) ? 'disabled' : ''}`}
                      onClick={() => handleOptionClick(option)}
                      title={disabledOptions.includes(option) ? "Already selected" : ""}
                    >
                      {String(option)}
                      {disabledOptions.includes(option) && <span className="option-disabled-indicator"> (already selected)</span>}
                    </div>
                  ))}
                  {/* Add an empty div at the end to ensure content is scrollable */}
                  <div style={{ height: "50px" }}></div>
                </>
              ) : (
                <div className="no-options">No matches found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchableDropdown;