import React, { useState, useEffect, useRef, useContext, createContext } from "react";

// Create a context to track which dropdown is currently open
const DropdownContext = createContext({
  openDropdownId: null,
  setOpenDropdownId: () => {}
});

// Export the provider to be used in a parent component
export const DropdownProvider = ({ children }) => {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  return (
    <DropdownContext.Provider value={{ openDropdownId, setOpenDropdownId }}>
      {children}
    </DropdownContext.Provider>
  );
};

const SearchableField = ({ 
  options = [], 
  onChange, 
  value = "", 
  placeholder = "Search...", 
  label = "Search",
  disabled = false,
  index = 0, // Controls dropdown direction: up (1) or down (0)
  rowIndex = 0,
  activeRow = false,
  preventHover = false,
  showAllOnFocus = true, // Changed default to true for better UX
  id = null,
  maxResults = 100 // New prop to control max results shown
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // For keyboard navigation
  
  // Refs
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const mouseLeaveTimeoutRef = useRef(null);
  
  // Generate a unique ID for this dropdown if none is provided
  const uniqueId = useRef(id || `searchable-field-${Math.random().toString(36).substring(2, 11)}`).current;
  
  // Access the dropdown context
  const { openDropdownId, setOpenDropdownId } = useContext(DropdownContext);

  // Update component state when value changes externally
  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm.trim() && !showAllOnFocus) {
      setFilteredOptions([]);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = options
        .filter(option => 
          !searchTerm.trim() || 
          (typeof option === 'string' && option.toLowerCase().includes(lowercaseSearch))
        )
        .slice(0, maxResults);
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, showAllOnFocus, maxResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close this dropdown if another one opens
  useEffect(() => {
    if (openDropdownId !== null && openDropdownId !== uniqueId && isOpen) {
      closeDropdown();
    }
  }, [openDropdownId, uniqueId, isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
      }
    };
  }, []);

  // Function to close dropdown with animation
  const closeDropdown = () => {
    if (isOpen) {
      setIsClosing(true);
      setHighlightedIndex(-1); // Reset highlighted option
      
      // Short timeout for animation to complete
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        
        // Only clear the global open dropdown ID if this field was the one that was open
        if (openDropdownId === uniqueId) {
          setOpenDropdownId(null);
        }
      }, 150); // Match animation duration
    }
  };

  const handleInputChange = (e) => {
    if (disabled) return;
    
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    // Always open dropdown when typing
    if (!isOpen) {
      setIsOpen(true);
      setOpenDropdownId(uniqueId);
    }
    
    // Reset highlighted index when typing
    setHighlightedIndex(-1);
    
    // If the input is cleared and this isn't just for searching, also clear the selected value
    if (!newValue.trim()) {
      onChange("");
    }
  };

  const handleOptionClick = (option) => {
    if (disabled) return;
    
    setSearchTerm(option);
    onChange(option);
    closeDropdown();
  };

  const handleInputFocus = () => {
    if (disabled) return;
    
    setIsOpen(true);
    setOpenDropdownId(uniqueId);
    
    // Show all options when field is focused if showAllOnFocus is true
    if (showAllOnFocus && options.length > 0) {
      // This will trigger the useEffect to update filteredOptions
      setSearchTerm(searchTerm);
    }
    
    // Cancel any pending close
    if (mouseLeaveTimeoutRef.current) {
      clearTimeout(mouseLeaveTimeoutRef.current);
      mouseLeaveTimeoutRef.current = null;
    }
  };

  const handleClearSearch = (e) => {
    if (disabled) return;
    
    // Stop event propagation to prevent dropdown from opening
    e.stopPropagation();
    
    setSearchTerm("");
    onChange("");
    
    // Focus back on the input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled || !isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
        
      case 'Tab':
        closeDropdown();
        break;
        
      default:
        break;
    }
  };

  // Scroll to highlighted option
  useEffect(() => {
    if (isOpen && resultsRef.current && highlightedIndex >= 0) {
      const highlightedElement = resultsRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ 
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Highlight matching text in search results
  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="match-highlight">$1</span>');
  };

  // Mouse event handlers
  const handleMouseEnter = () => {
    if (preventHover) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (preventHover) return;
    setIsHovered(false);
  };

  // Calculate dropdown position
  const dropdownPosition = index > 0 ? 'position-above' : 'position-below';

  return (
    <div 
      className={`searchable-field ${disabled ? 'disabled' : ''}`} 
      ref={containerRef}
      data-field-id={uniqueId}
      style={{ 
        zIndex: isOpen ? 10000 : (activeRow ? 1000 : 5),
        isolation: 'isolate',
        position: 'relative'
      }}
    >
      {label && (
        <label htmlFor={`input-${uniqueId}`} className="searchable-field-label">
          {label}
        </label>
      )}
      
      <div 
        className={`search-input-container ${!preventHover && isHovered ? 'hovered' : ''} ${isOpen ? 'focused' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <input
          id={`input-${uniqueId}`}
          type="text"
          ref={inputRef}
          className={`search-input ${disabled ? 'disabled' : ''} ${isOpen && index > 0 ? 'input-with-dropdown-above' : ''}`}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={`dropdown-${uniqueId}`}
          aria-haspopup="listbox"
        />
        
        {searchTerm && !disabled && (
          <button
            type="button"
            className="clear-search-button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            tabIndex="-1" // Skip in tab order for better keyboard UX
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      
      {(isOpen || isClosing) && !disabled && (
        <div 
          id={`dropdown-${uniqueId}`}
          className={`search-results ${dropdownPosition} ${isClosing ? 'closing' : ''}`}
          style={{ 
            zIndex: 10001,
            position: 'absolute',
            width: '100%',
            transform: 'translateZ(0)',
            isolation: 'isolate',
            marginBottom: index > 0 ? '0' : undefined,
            marginTop: index > 0 ? '0' : '0.375rem',
            animation: isClosing ? 'fadeOut 0.15s ease-out forwards' : 'fadeIn 0.2s ease-out'
          }}
          role="listbox"
          aria-labelledby={`input-${uniqueId}`}
        >
          {filteredOptions.length > 0 ? (
            <div className="search-results-list" ref={resultsRef}>
              {filteredOptions.map((option, idx) => (
                <div
                  key={idx}
                  id={`option-${uniqueId}-${idx}`}
                  className={`search-result-item ${
                    option === value ? 'selected' : ''
                  } ${highlightedIndex === idx ? 'highlighted' : ''}`}
                  onClick={() => handleOptionClick(option)}
                  dangerouslySetInnerHTML={{ 
                    __html: highlightMatch(option, searchTerm) 
                  }}
                  role="option"
                  aria-selected={option === value}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                />
              ))}
            </div>
          ) : (
            <div className="search-result-item no-results">
              {searchTerm ? "No matches found" : "Start typing to search..."}
            </div>
          )}
          
          {filteredOptions.length > 0 && filteredOptions.length === maxResults && (
            <div className="search-results-limit-note">
              Showing first {maxResults} results
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableField;