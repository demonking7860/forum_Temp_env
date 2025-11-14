import React, { useState, useEffect } from "react";
import { styled } from "@mui/system";

// Styled container for glass effect with improved width handling
const Container = styled("div")({
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
  // background: "rgba(255, 255, 255, 0.3)", // This line is duplicated below
  backdropFilter: "blur(12px)",
  textAlign: "center",
  marginTop: "20px",
  marginBottom: "15px", // Reduced from 30px to 15px to decrease gap with footer
  width: "100%",
  boxSizing: "border-box",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  maxWidth: "100%", // Ensure container doesn't overflow parent
  background: "rgba(255, 255, 255, 0.3)",
  minHeight: "300px", // Add minimum height to ensure container is taller
  
  "@media (max-width: 992px)": {
    padding: "15px",
    marginBottom: "15px", // Reduced from 25px to 15px
    minHeight: "250px", // Slightly smaller minimum height on tablets
  },
  
  "@media (max-width: 768px)": {
    padding: "12px 5px", // Reduced horizontal padding for more content width
    width: "100%", // Full width on mobile
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: "10px", // Reduced from 15px to 10px
    marginTop: "15px", 
    // background: "rgba(255, 255, 255, 0.3)", // This line is duplicated below
    minHeight: "220px", // Slightly smaller minimum height on phones
  }
});

// Improve the TableScrollContainer to prevent cut-off rows and fix vertical scrolling
const TableScrollContainer = styled("div")({
  width: "100%",
  overflowX: "auto",
  overflowY: "hidden", // Default for desktop
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "auto",
  position: "relative",
  borderRadius: "8px",
  padding: "5px",
  paddingBottom: "10px", 
  transform: "translateZ(0)",
  WebkitTransform: "translateZ(0)",
  height: "auto", 
  maxHeight: "none", 

  // Scrollbar styles (default/desktop)
  "&::-webkit-scrollbar": {
    height: "8px",
    width: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "rgba(0, 0, 0, 0.05)",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "rgba(97, 218, 251, 0.3)",
    borderRadius: "4px",
    "&:hover": {
      background: "rgba(97, 218, 251, 0.5)",
    },
  },

  scrollbarWidth: "thin",
  scrollbarColor: "rgba(97, 218, 251, 0.3) rgba(0, 0, 0, 0.05)",

  // Touch devices: hide scrollbars but allow scrolling
  "@media (hover: none)": {
    overflowY: "auto",
    maxHeight: "70vh",
    padding: "3px",
    marginBottom: "5px",
    border: "1px solid rgba(200, 200, 200, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    scrollbarWidth: "none", // Firefox
    msOverflowStyle: "none", // IE
    "&::-webkit-scrollbar": {
      display: "none", // Chrome/Safari
    },
  },
});
const StyledTable = styled("table")({
  width: "100%",
  minWidth: "800px",
  borderCollapse: "collapse",
  marginTop: "10px",
  fontFamily: "'Poppins', sans-serif",
  fontSize: "clamp(0.75rem, 1.25vw, 1rem)",
  color: "#000",
  tableLayout: "fixed",
  
  "tbody tr": {
    maxHeight: "60px",
  }
});

const StyledTh = styled("th")({
  padding: "10px",
  borderBottom: "2px solid #ddd",
  backgroundColor: "rgba(255, 255, 255, 0.4)",
  fontWeight: "bold",
  textTransform: "uppercase",
  position: "sticky",
  top: 0,
  zIndex: 10,
  wordWrap: "break-word",
  fontSize: "clamp(0.7rem, 1vw, 0.875rem)",
  lineHeight: 1.3,
  textAlign: "center",
  minWidth: "90px",
  maxWidth: "200px",
  whiteSpace: "normal",
  overflowWrap: "break-word",
  transition: "padding 0.3s ease, font-size 0.3s ease",
  
  "@media (max-width: 992px)": {
    padding: "8px",
    fontSize: "clamp(0.65rem, 0.9vw, 0.75rem)",
  }
});

const StyledTr = styled("tr")({
  borderBottom: "1px solid #ddd",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  transition: "background 0.3s ease",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  overflow: "visible"
});

const StyledTd = styled("td")({
  padding: "10px",
  textAlign: "center",
  wordWrap: "break-word",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: "90px",
  maxWidth: "200px",
  whiteSpace: "normal",
  overflowWrap: "break-word",
  fontSize: "clamp(0.75rem, 1.1vw, 0.9375rem)",
  lineHeight: 1.4,
  transition: "padding 0.3s ease, font-size 0.3s ease",
  
  "@media (max-width: 992px)": {
    padding: "8px 6px",
    fontSize: "clamp(0.7rem, 0.9vw, 0.8125rem)",
  },

  "@media (max-width: 768px)": {
    overflow: "visible",
    textOverflow: "clip",
    whiteSpace: "normal",
    wordBreak: "break-word",
    maxWidth: "none",
  }
});

const truncateText = (text, maxLength = 40, noShorten = false) => {
  if (!text || text.length <= maxLength || noShorten) return text;
  return text.substring(0, maxLength - 3) + '...';
};

const PlacementList = ({ data, noShortening = false }) => {
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleScroll = () => {
    if (showSwipeIndicator) {
      setShowSwipeIndicator(false);
    }
  };
  
  if (!data || data.length === 0) {
    return (
      <Container>
        <h2 style={{ 
          fontFamily: "'Poppins', sans-serif", 
          color: "#000",
          fontSize: "clamp(1.25rem, 2vw, 1.5rem)"
        }}>
          No Placement Results Found
        </h2>
        <p>Try adjusting your search criteria.</p>
      </Container>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    const yearDiff = Number(b.date) - Number(a.date);
    if (yearDiff !== 0) return yearDiff;
    return (a.college || '').toLowerCase().localeCompare((b.college || '').toLowerCase());
  });

  const mobileColumns = (
    <>
      <StyledTh style={{ minWidth: "150px", maxWidth: "220px", fontSize: "clamp(0.6rem, 0.8vw, 0.7rem)"}}>Institution</StyledTh>
      <StyledTh style={{ minWidth: "120px", maxWidth: "180px", fontSize: "clamp(0.6rem, 0.8vw, 0.7rem)"}}>Designation</StyledTh>
      <StyledTh style={{ minWidth: "150px", maxWidth: "220px", fontSize: "clamp(0.6rem, 0.8vw, 0.7rem)"}}>Name</StyledTh>
      <StyledTh style={{ minWidth: "60px", maxWidth: "80px", fontSize: "clamp(0.6rem, 0.8vw, 0.7rem)", whiteSpace: "nowrap", overflow: "visible"}}>Year</StyledTh>
      <StyledTh style={{ minWidth: "80px", fontSize: "clamp(0.6rem, 0.8vw, 0.7rem)"}}>University</StyledTh>
      <StyledTh style={{ minWidth: "60px", fontSize: "clamp(0.6rem, 0.8vw, 0.7rem)"}}>Program</StyledTh>
    </>
  );

  const desktopColumns = (
    <>
      <StyledTh style={{ minWidth: "110px" }}>Program</StyledTh>
      <StyledTh style={{ minWidth: "140px", maxWidth: "220px" }}>University</StyledTh>
      <StyledTh style={{ minWidth: "70px", maxWidth: "100px" }}>Year</StyledTh>
      <StyledTh style={{ minWidth: "140px" }}>Name</StyledTh>
      <StyledTh style={{ minWidth: "200px", maxWidth: "200px" }}>Institution</StyledTh> {/* Corrected 200 to 200px for minWidth for clarity/safety */}
      <StyledTh style={{ minWidth: "140px" }}>Designation</StyledTh>
    </>
  );

  return (
    <Container>
      <h2 style={{ 
        fontFamily: "'Poppins', sans-serif", 
        color: "#000", 
        fontSize: "clamp(1.25rem, 3vw, 1.5rem)",
        lineHeight: 1.3
      }}>
        Placement Results
      </h2>

      <TableScrollContainer onScroll={handleScroll}>
        <StyledTable>
          <thead>
            <tr>
              {isMobile ? mobileColumns : desktopColumns}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((entry, index) => (
              <StyledTr key={index}>
                {isMobile ? (
                  <>
                    <StyledTd title={entry.institution || "Unknown"}>{truncateText(entry.institution || "Unknown", 200, isMobile || noShortening)}</StyledTd>
                    <StyledTd title={entry.role || "Unknown"}>{truncateText(entry.role || "Unknown", 200, isMobile || noShortening)}</StyledTd>
                    <StyledTd title={entry.name || "Unknown"}>{truncateText(entry.name || "Unknown", 200, isMobile || noShortening)}</StyledTd>
                    <StyledTd style={{ overflow: "visible", whiteSpace: "nowrap" }}>{entry.date || "Unknown"}</StyledTd>
                    <StyledTd title={entry.university || "Not specified"}>{truncateText(entry.university || "Not specified", 200, isMobile || noShortening)}</StyledTd>
                    <StyledTd title={entry.program || "Not specified"}>{truncateText(entry.program || "Not specified", 200, isMobile || noShortening)}</StyledTd>
                  </>
                ) : (
                  <>
                    <StyledTd title={entry.program || "Not specified"}>{truncateText(entry.program || "Not specified", 40, noShortening)}</StyledTd>
                    <StyledTd title={entry.university || "Not specified"}>{truncateText(entry.university || "Not specified", 40, noShortening)}</StyledTd>
                    <StyledTd style={{ overflow: "visible", whiteSpace: "nowrap" }}>{entry.date || "Unknown"}</StyledTd>
                    <StyledTd title={entry.name || "Unknown"}>{truncateText(entry.name || "Unknown", 40, noShortening)}</StyledTd>
                    <StyledTd title={entry.institution || "Unknown"}>{truncateText(entry.institution || "Unknown", 40, noShortening)}</StyledTd>
                    <StyledTd title={entry.role || "Unknown"}>{truncateText(entry.role || "Unknown", 40, noShortening)}</StyledTd>
                  </>
                )}
              </StyledTr>
            ))}
          </tbody>
        </StyledTable>
      </TableScrollContainer>
    </Container>
  );
};

export default PlacementList;