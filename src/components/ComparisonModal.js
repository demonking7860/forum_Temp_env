import React, { useState, useEffect, useMemo } from "react";
import "./ComparisonModal.css";
import SearchableField, { DropdownProvider } from "./SearchableField";

const ComparisonModal = ({ 
  isOpen, 
  onClose, 
  universities, 
  fields, 
  programs = ["PhD"], 
  onCompare, 
  minUniversities = 2, 
  showValidationWarnings = true,
  comparisonError = null
}) => {
  const [selectedUniversities, setSelectedUniversities] = useState([
    { university: "", field: "ECONOMICS" },
    { university: "", field: "ECONOMICS" }
  ]);
  const [selectedProgram, setSelectedProgram] = useState("PhD");
  const [validationError, setValidationError] = useState(null);
  const [selectedUniSet, setSelectedUniSet] = useState(new Set());
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comparisonInProgress, setComparisonInProgress] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedUniversities([
        { university: "", field: "ECONOMICS" },
        { university: "", field: "ECONOMICS" }
      ]);
      setSelectedProgram("PhD");
      setValidationError(null);
      setSelectedUniSet(new Set());
      setActiveRowIndex(null);
      setIsSubmitting(false);
      setComparisonInProgress(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (comparisonError) {
      setValidationError(comparisonError);
    }
  }, [comparisonError]);

  const handleCloseModal = () => {
    onClose();
    setSelectedUniversities([
      { university: "", field: "ECONOMICS" },
      { university: "", field: "ECONOMICS" }
    ]);
    setSelectedProgram("PhD");
    setValidationError(null);
    setSelectedUniSet(new Set());
    setActiveRowIndex(null);
    setIsSubmitting(false);
  };

  const transitionTiming = "0.2s ease-out";

  const reversedUniversities = useMemo(() => {
    return [...selectedUniversities].reverse();
  }, [selectedUniversities]);

  const handleAddUniversity = () => {
    try {
      setSelectedUniversities(prev => [...prev, { university: "", field: "ECONOMICS" }]);
      setTimeout(() => {
        setActiveRowIndex(selectedUniversities.length);
        const newField = document.querySelector(`.selection-row:first-child .searchable-field input`);
        if (newField) newField.focus();
      }, 50);
    } catch (error) {
      setValidationError("Error adding university. Please try again.");
    }
  };

  const handleRemoveUniversity = (index) => {
    try {
      if (selectedUniversities.length <= minUniversities) {
        setValidationError(`At least ${minUniversities} universities are required for comparison`);
        return;
      }
      const newUniversities = [...selectedUniversities];
      const removedUni = newUniversities[index].university;
      if (removedUni) {
        const newSet = new Set(selectedUniSet);
        newSet.delete(removedUni);
        setSelectedUniSet(newSet);
      }
      newUniversities.splice(index, 1);
      setSelectedUniversities(newUniversities);
      setValidationError(null);
    } catch (error) {
      setValidationError("Error removing university. Please try again.");
    }
  };

  const handleUniversityChange = (index, value) => {
    try {
      const prevUni = selectedUniversities[index].university;
      if (prevUni) {
        const newSet = new Set(selectedUniSet);
        newSet.delete(prevUni);
        setSelectedUniSet(newSet);
      }
      if (value && selectedUniSet.has(value)) {
        setValidationError("Each university can only be selected once");
        return;
      }
      if (value) {
        const newSet = new Set(selectedUniSet);
        newSet.add(value);
        setSelectedUniSet(newSet);
      }
      const newUniversities = [...selectedUniversities];
      newUniversities[index] = { ...newUniversities[index], university: value };
      setSelectedUniversities(newUniversities);
      setValidationError(null);
    } catch (error) {
      setValidationError("Error updating university selection. Please try again.");
    }
  };

  const validateSelections = () => {
    try {
      if (selectedUniversities.length < minUniversities) {
        setValidationError(`At least ${minUniversities} universities are required for comparison`);
        return false;
      }
      const validUniversities = selectedUniversities.filter(
        ({ university }) => university && university.trim() !== ""
      );
      if (validUniversities.length < minUniversities) {
        setValidationError(`Please select at least ${minUniversities} universities to compare`);
        return false;
      }
      const missingFields = validUniversities.some(uf => !uf.field);
      if (missingFields) {
        setValidationError("Please select a field for each university");
        return false;
      }
      if (!selectedProgram) {
        setValidationError("Please select a program for comparison");
        return false;
      }
      const uniNames = validUniversities.map(uf => uf.university);
      const uniqueUnis = new Set(uniNames);
      if (uniqueUnis.size !== validUniversities.length) {
        setValidationError("Each university can only be selected once");
        return false;
      }
      return true;
    } catch (error) {
      setValidationError("Error validating selections. Please try again.");
      return false;
    }
  };

  const scrollToResults = () => {
    // Wait for comparison results to render
    setTimeout(() => {
      // Try multiple selectors to find the comparison results section
      const selectors = [
        ".comparison-results", 
        ".comparison-container", 
        ".university-comparison", 
        "#comparison-section"
      ];
      
      // Find the first element that exists in the DOM
      let resultsElement = null;
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          resultsElement = element;
          break;
        }
      }
      
      if (resultsElement) {
        // Scroll to the element
        resultsElement.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
        
        // Add highlight effect to draw attention
        resultsElement.classList.add("highlight-results");
        
        // Remove highlight after animation completes
        setTimeout(() => {
          resultsElement.classList.remove("highlight-results");
        }, 2500);
      } else {
        // Retry after a delay if element isn't found
        setTimeout(() => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              element.scrollIntoView({ 
                behavior: "smooth", 
                block: "start" 
              });
              
              element.classList.add("highlight-results");
              setTimeout(() => {
                element.classList.remove("highlight-results");
              }, 2500);
              
              break;
            }
          }
        }, 1000);
      }
    }, 300);
  };

  const handleCompare = () => {
    try {
      setValidationError(null);
      setIsSubmitting(true);
      setComparisonInProgress(true);

      if (!validateSelections()) {
        setIsSubmitting(false);
        setComparisonInProgress(false);
        return;
      }

      const validUniversities = selectedUniversities
        .filter(({ university }) => university && university.trim() !== "")
        .map(({ university }) => ({
          university,
          field: "ECONOMICS",
          program: "PhD"
        }));

      // Call onCompare and handle the result
      const success = onCompare(validUniversities);

      // If onCompare explicitly returns false, reset submission state
      // This handles cases where no data is found or validation fails
      if (success === false) {
        setIsSubmitting(false);
        setComparisonInProgress(false);
      } else {
        // Close the modal first
        onClose();
        
        // Then scroll to results with a slight delay to ensure DOM updates
        setTimeout(() => {
          scrollToResults();
        }, 100);
      }
      
    } catch (error) {
      setValidationError("Error starting comparison. Please try again.");
      setIsSubmitting(false);
      setComparisonInProgress(false);
    }
  };

  const getSelectedUniversitiesExcept = (currentIndex) => {
    try {
      return selectedUniversities
        .filter((item, index) => index !== currentIndex && item.university)
        .map(item => item.university);
    } catch (error) {
      return [];
    }
  };

  const truncateText = (text, maxLength = 28) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const handleRowMouseEnter = (index) => {
    setActiveRowIndex(index);
  };

  const handleRowMouseLeave = () => {
    setActiveRowIndex(null);
  };

  const handleRowClick = (index) => {
    setActiveRowIndex(index === activeRowIndex ? null : index);
  };

  const hasSelectedUniversity = useMemo(() => {
    return selectedUniversities.some(item => item.university && item.university.trim() !== "");
  }, [selectedUniversities]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content-comparison">
        <DropdownProvider>
          <div className="modal-header">
            <h1 className="modal-title">SELECT UNIVERSITIES TO COMPARE</h1>
            <button className="close-button" onClick={handleCloseModal} aria-label="Close"></button>
          </div>

          <div className="modal-body">
            {validationError && showValidationWarnings && (
              <div className="validation-error">{validationError}</div>
            )}
            
            <div className="program-field-banner">
              <div className="program-field-content">
                <span className="program-field-label">Program & Field:</span>
                <span className="program-field-value">PhD in Economics</span>
              </div>
            </div>

            {selectedUniversities.length === 0 && (
              <div className="empty-selections-message">
                <p>Add universities to compare their placement data</p>
              </div>
            )}

            <div className="university-selection-list" 
              style={{ 
                position: 'relative',
                isolation: 'isolate',
                contain: 'layout',
                zIndex: 5
              }}
            >
              {reversedUniversities.map((item, reversedIndex) => {
                const index = selectedUniversities.length - 1 - reversedIndex;
                
                const disabledOptions = getSelectedUniversitiesExcept(index);
                const filteredUniversities = (universities || []).filter(uni => !disabledOptions.includes(uni));
                
                return (
                  <div 
                    key={index} 
                    className={`selection-row ${activeRowIndex === index ? 'active-row' : ''}`}
                    onMouseEnter={() => handleRowMouseEnter(index)}
                    onMouseLeave={handleRowMouseLeave}
                    onClick={() => handleRowClick(index)}
                    style={{ 
                      zIndex: selectedUniversities.length - index,
                      position: 'relative',
                      isolation: 'isolate',
                      transform: 'translateZ(0)',
                      transition: `background-color ${transitionTiming}, box-shadow ${transitionTiming}`,
                      animation: 'fadeSlideIn 0.3s ease-out'
                    }}
                  >
                    <div className="uni-counter">{index + 1}</div>
                    <div className="uni-selection" style={{ 
                      position: 'relative', 
                      zIndex: 5,
                      transform: 'translateZ(0)'
                    }}>
                      <SearchableField
                        options={filteredUniversities}
                        onChange={(value) => handleUniversityChange(index, value)}
                        placeholder="Search for university..."
                        value={item.university || ""}
                        label={`University ${index + 1}`}
                        index={reversedIndex > 0 ? 1 : 0}
                        rowIndex={index}
                        activeRow={activeRowIndex === index}
                        preventHover={true}
                        showAllOnFocus={true}
                      />
                      {item.university && (
                        <div className="selected-university" title={item.university}>
                          {truncateText(item.university)}
                        </div>
                      )}
                    </div>
                    <button
                      className={`remove-selection-button ${activeRowIndex === index ? 'visible' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUniversity(index);
                      }}
                      disabled={selectedUniversities.length <= minUniversities}
                      aria-label="Remove university"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-footer">
            <div className="footer-left">
              <button
                className="add-university-button"
                onClick={handleAddUniversity}
                aria-label="Add university"
                title="Add another university"
              >
                <span className="plus-icon">+</span>
                <span className="button-text">Add University</span>
              </button>
            </div>
            <div className="footer-right">
              <button className="cancel-button" onClick={handleCloseModal}>
                Cancel
              </button>
              <button
                className="search-button"
                onClick={handleCompare}
                disabled={
                  isSubmitting || 
                  selectedUniversities.filter(({ university }) => university).length < minUniversities
                }
              >
                {isSubmitting ? "Comparing..." : "Compare"}
              </button>
            </div>
          </div>
        </DropdownProvider>
      </div>
    </div>
  );
};

export default ComparisonModal;
