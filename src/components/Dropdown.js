import React, { useState, useEffect } from "react";
import {
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress
} from "@mui/material";
import { styled } from "@mui/system";

// Function to capitalize each word
const capitalize = (str) => {
  if (typeof str !== "string") return str;
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Styled FormControl for glassy effect
const GlassyFormControl = styled(FormControl)({
  margin: "10px",
  minWidth: 200,
  borderRadius: "15px",
  background: "rgba(255, 255, 255, 0.3)", // Translucent effect
  backdropFilter: "blur(10px)", // Glass effect
  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
});

// Styled Select dropdown
const GlassySelect = styled(Select)({
  borderRadius: "15px",
  "&.MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black border
    },
    "&:hover fieldset": {
      borderColor: "#000",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#000",
    },
  },
  background: "rgba(255, 255, 255, 0.4)",
  backdropFilter: "blur(10px)",
  color: "#000", // Change font to black
  fontWeight: "bold",
});

// Styled InputLabel
const StyledInputLabel = styled(InputLabel)({
  color: "#000", // Label text in black
  fontWeight: "bold",
});

const Dropdown = ({ label, options, value, onChange, loading }) => {
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  return (
    <GlassyFormControl variant="outlined" fullWidth>
      <StyledInputLabel>{label}</StyledInputLabel>
      <GlassySelect value={value} onChange={onChange} label={label} disabled={loading}>
        {/* Loading indicator */}
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={24} />
          </MenuItem>
        ) : filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => (
            <MenuItem key={index} value={option} style={{ color: "#000", fontWeight: "bold" }}>
              {capitalize(option)}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No options available</MenuItem>
        )}
      </GlassySelect>
    </GlassyFormControl>
  );
};

export default Dropdown;