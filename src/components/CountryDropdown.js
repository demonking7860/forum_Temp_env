import React from 'react';
import Select from 'react-select';
import { formatCountryOptions } from '../data/countries';

const countryOptions = formatCountryOptions();

const selectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '2.5rem',
    height: 'auto',
    borderRadius: 'var(--border-radius-medium, 6px)',
    padding: '0.1rem 0.3rem',
    background: 'rgba(255, 255, 255, 0.8)',
    border: state.isFocused
      ? '1px solid rgba(97, 218, 251, 0.8)'
      : '1px solid rgba(97, 218, 251, 0.5)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(97, 218, 251, 0.2)' : 'none',
    '&:hover': {
      borderColor: 'rgba(97, 218, 251, 0.8)'
    },
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontSize: 'inherit',
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: 'var(--border-radius-medium, 6px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 10001,
    overflow: 'hidden',
    backgroundColor: 'white',
    maxHeight: '200px',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
  }),
  option: (provided, state) => ({
    ...provided,
    padding: '8px 12px',
    backgroundColor: state.isSelected
      ? 'rgba(97, 218, 251, 0.2)'
      : state.isFocused
        ? 'rgba(97, 218, 251, 0.1)'
        : provided.backgroundColor,
    color: state.isSelected ? '#1a6985' : '#333',
    cursor: 'pointer',
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: 'inherit',
    borderLeft: state.isSelected ? '3px solid #1a6985' : 'none',
    paddingLeft: state.isSelected ? '9px' : '12px',
    transition: 'background-color 0.15s ease, border-left 0.15s ease',
    '&:active': {
      backgroundColor: 'rgba(97, 218, 251, 0.2)',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#6c757d',
    fontWeight: 400,
    fontSize: 'inherit',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#333',
    fontWeight: 500,
    fontSize: 'inherit',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0px 4px',
  }),
  input: (provided) => ({
    ...provided,
    margin: '0px',
    padding: '0px',
    fontSize: 'inherit',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#6c757d',
    padding: '4px',
    '&:hover': {
      color: '#1a6985',
    },
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: '#6c757d',
    '&:hover': {
      color: '#dc3545',
    },
  }),
  menuList: (provided) => ({
    ...provided,
    paddingTop: '4px',
    paddingBottom: '4px',
    maxHeight: '180px',
  }),
};

const CountryDropdown = ({ 
  value, 
  onChange, 
  onBlur,
  onKeyDown,
  placeholder = "Select country...", 
  isDisabled = false,
  className = "react-select-container",
  autoFocus = false
}) => {
  const getSelectValue = (value) => {
    if (!value) return null;
    
    // Handle case-insensitive matching for existing values
    const normalizedValue = value.toUpperCase();
    const matchingOption = countryOptions.find(option => 
      option.value.toUpperCase() === normalizedValue
    );
    
    return matchingOption || null;
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (onKeyDown) {
        onKeyDown(event);
      }
    } else if (event.key === 'Escape') {
      if (onKeyDown) {
        onKeyDown(event);
      }
    }
  };

  const handleChange = (selected) => {
    const selectedValue = selected?.value || "";
    onChange(selectedValue);
  };

  return (
    <Select
      value={getSelectValue(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDownCapture={handleKeyDown}  // <-- use capture phase here

      options={countryOptions}
      styles={selectStyles}
      placeholder={placeholder}
      isSearchable={true}
      isClearable={true}
      isDisabled={isDisabled}
      autoFocus={autoFocus}
      className={className}
      classNamePrefix="react-select"
      menuPlacement="bottom"
      menuPosition="absolute"
      aria-label="Select Country"
      // Ensure the dropdown opens with the current value pre-selected
      defaultValue={getSelectValue(value)}
    />
  );
};

export default CountryDropdown;
