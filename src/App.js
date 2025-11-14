import React, { useState, Suspense, useCallback, useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Select from 'react-select';
import { DropdownProvider } from "./components/SearchableField";
import ErrorBoundary from "./components/ErrorBoundary";
import PlacementList from "./components/PlacementList";
import ComparisonTable from "./components/ComparisonTable";
import TermsAndConditions from "./components/TermsAndConditions";
import Header from "./components/Header"; // Import the new Header component
import AdminComponent from "./components/AdminComponent"; // Import AdminComponent
import ProgramViewPage from './components/ProgramViewPage';
import DepartmentView from './components/DepartmentView';
import './styles.css';
import './components/Header.css'; // Import Header CSS
import './components/AdminComponent.css'; // Import AdminComponent CSS
import './components/AdminTable.css'; // Import AdminTable CSS
import { Authenticator , useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import { COUNTRY_CODES } from './data/countries';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { APP_CONFIG } from "./config";
import { generateClient } from 'aws-amplify/api';
import { trackFeatureUsage } from './utils/featureUsage';
import trackUserSession from './utils/trackUserSession';
import { getUserAvatarFast } from './utils/avatarLookup';
import CustomAuthenticator from './components/CustomAuthenticator';
import { getConfigValue } from './config';
import { I18n } from '@aws-amplify/core'; // correct import for v6+
import Tickets from "./components/tickets/Tickets";



// Custom i18n mapping for "user exists" errors
const customErrorMessages = {
  en: {
    'UsernameExistsException':
      'This email is already registered. Please sign in with Google or email instead.',
    'User already exists':
      'This email is already registered. Please sign in with Google or email instead.',
    'An account with the given email already exists.':
      'This email is already registered. Please sign in with Google or email instead.',
  }
};


const API_URL = process.env.REACT_APP_API_URL ;
const ADMIN_API_BASE_URL = process.env.REACT_APP_API_URL_ADMIN || 'http://localhost:4000/';
const FILTERS_DATA_ENDPOINT = `${API_URL}/prod/filters`;
const PLACEMENTS_API_BASE_URL = `${API_URL}prod`;
const API_KEY = process.env.REACT_APP_API_KEY || 'YOUR_DEFAULT_API_KEY';




const client = generateClient();















const logError = (error, context = '') => {
    console.error(`[${context}]`, error);
};

const fetchData = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            ...options,
            headers: { "Content-Type": "application/json", "Referer": API_KEY, ...options.headers }
        });
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
                const errorDetails = JSON.parse(errorText);
                throw new Error(errorDetails.message || `API Error: ${response.status} - ${errorText}`);
            } catch (e) {
                throw new Error(`API Error: ${response.status} - ${errorText || 'Could not read error response'}`);
            }
        }
        return response.json();
    } catch (error) {
        logError(error, `API Request to ${url}`);
        throw error;
    }

};

const addUniversities = async (universities) => {
    try {
        const response = await fetchData(`${ADMIN_API_BASE_URL}universities`, {
            method: 'POST',
            body: JSON.stringify({ universities })
        });
        return response;
    } catch (error) {
        logError(error, 'addUniversities');
        throw error;
    }
};

const fetchAllUniversities = async () => {
    try {
        const response = await fetchData(`${PLACEMENTS_API_BASE_URL}/universities`);
        return Array.isArray(response) ? response : [];
    } catch (error) {
        logError(error, 'fetchAllUniversities');
        return [];
    }
};


// --- Specific API Calls ---
const fetchPlacementDetails = async (params) => {
    if (!params || !params.institution || !params.program) {
        throw new Error("Institution and program are required parameters for reverse search");
    }
    const requestBody = {
        institution: params.institution.trim(),
        program: params.program,
        fromYear: params.fromYear || "",
        toYear: params.toYear || "",
        degree: "PhD",
        requestType: "reverseSearch"
    };
    try {
        const response = await fetchData(`${PLACEMENTS_API_BASE_URL}/placements/reverseSearch`, {
            method: "POST",
            body: JSON.stringify(requestBody)
        });
        const [normalizedData, totalCount] = normalizeData(response);
        return {
            success: true,
            data: normalizedData || [],
            totalCount: totalCount,
            message: normalizedData?.length > 0 ?
                `Found ${totalCount} ${totalCount === 1 ? 'graduate' : 'graduates'}` :
                "No placement data found for this institution"
        };
    } catch (error) {
        logError(error, 'Reverse Placement API Request');
        return { success: false, data: [], totalCount: 0, message: error.message || "Failed to retrieve placement data" };
    }
};

// --- Data Normalization & Formatting ---
const normalizeData = (data) => { /* ... (same as before) ... */
    if (data && data.results && Array.isArray(data.results)) {
        const flatResults = data.results.every(Array.isArray) ? data.results.flat() : data.results;
        return [flatResults, data.totalMatches || flatResults.length];
    }
    if (Array.isArray(data)) {
        return [data, data.length];
    }
    return [[], 0];
}

const formatSelectOptions = (data, addEmptyOption = false, emptyLabel = "ALL") => { /* ... (same as before) ... */
    if (!Array.isArray(data)) {
        return addEmptyOption ? [{ value: "", label: emptyLabel }] : [];
    }
    const options = data
        .filter(item => item !== null && item !== undefined && item !== "")
        .map(item => ({
            value: String(item),
            label: String(item)
        }));
    if (addEmptyOption) {
        return [{ value: "", label: emptyLabel }, ...options];
    }
    return options;
}

const getSelectValue = (options, value) => {
    if (value === null || value === undefined || value === "") {
        return options.find(option => option.value === "") || null;
    }
    const stringValue = String(value);
    return options.find(option => option.value === stringValue) || null;
}

// NOTE: code at this  part (exact is migrated to utils/formatters.js


    

const selectStyles = {
    control: (provided, state) => ({
        ...provided,
        minHeight: '3.5rem',
        height: 'auto',
        borderRadius: 'var(--border-radius-large)',
        padding: '0.3rem 0.8rem',
        background: 'var(--input-bg-color)',
        border: state.isFocused
            ? '1px solid var(--primary-color-dark)'
            : '1px solid var(--border-color-light)',
        boxShadow: state.isFocused ? '0 0 0 3px var(--focus-ring-color)' : 'none',
        '&:hover': {
            borderColor: 'var(--primary-color-medium)'
        },
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        fontSize: 'var(--font-size-small)',
    }),
    menu: (provided) => ({
        ...provided,
        borderRadius: 'var(--border-radius-medium)',
        boxShadow: 'var(--box-shadow-medium)',
        zIndex: 10001,
        overflow: 'hidden',
        backgroundColor: 'var(--bg-color-light)',
    }),

    option: (provided, state) => ({
        ...provided,
        padding: '10px 14px',
        backgroundColor: state.isSelected
            ? 'var(--primary-color-lightest)'
            : state.isFocused
                ? 'var(--hover-bg-color)'
                : provided.backgroundColor,
        color: state.isSelected ? 'var(--primary-color-dark)' : 'var(--text-color-primary)',
        cursor: 'pointer',
        fontWeight: state.isSelected ? 500 : 400,
        fontSize: 'var(--font-size-small)',
        borderLeft: state.isSelected ? '3px solid var(--primary-color-medium)' : 'none',
        paddingLeft: state.isSelected ? '11px' : '14px',
        transition: 'background-color 0.15s ease, border-left 0.15s ease',
        '&:active': {
            backgroundColor: 'var(--primary-color-lightest)',
        },
    }),
    placeholder: (provided) => ({
        ...provided,
        color: 'var(--text-color-placeholder)',
        fontWeight: 400,
        fontSize: 'var(--font-size-small)',
    }),
    singleValue: (provided) => ({
        ...provided,
        color: 'var(--text-color-primary)',
        fontWeight: 500,
        fontSize: 'var(--font-size-small)',
        whiteSpace: 'normal', // Allow text to wrap
        overflow: 'visible',  // Ensure wrapped text is visible
        textOverflow: 'clip', // Prevent ellipsis
        wordBreak: 'break-word', // Allow breaking long words
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '0px 4px',
    }),
    input: (provided) => ({
        ...provided,
        margin: '0px',
        padding: '0px',
        fontSize: 'var(--font-size-small)',
    }),
    indicatorSeparator: () => ({
        display: 'none',
    }),
    dropdownIndicator: (provided) => ({
        ...provided,
        color: 'var(--text-color-secondary)',
        padding: '8px',
        '&:hover': {
            color: 'var(--primary-color-dark)',
        },
    }),
    clearIndicator: (provided) => ({
        ...provided,
        color: 'var(--text-color-secondary)',
        '&:hover': {
            color: 'var(--error-color-dark)',
        },
    }),
    loadingIndicator: (provided) => ({
        ...provided,
        color: 'var(--primary-color-medium)',
    }),
    menuList: (provided) => ({
        ...provided,
        paddingTop: '4px',
        paddingBottom: '4px',
    }),
};

// --- Static Data (Primarily for Years if not from API) ---
const STATIC_FILTER_OPTIONS = {
    years: Array.from({ length: 2025 - 2005 + 1 }, (_, i) => 2005 + i)
};

// --- Fetch All Filter Data (Degrees, Universities, Programs) ---
const fetchAllFilterData = async () => {
    try {
        let token = null;
        try {
            const session = await fetchAuthSession();
            token = session.tokens?.accessToken?.toString(); // or idToken depending on what your backend expects
        } catch (err) {
            console.warn('User not signed in');
        }

        const headers = {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = `${API_URL}prod/filters`;
        if (token) console.log("🔐 Welcome back!");

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        return [{
            degree: "PhD",
            universities: []
        }];
    }
};

// --- Fetch Placement Data (for Search Tab) ---
const fetchPlacementData = async (params) => {
    try {
        const queryParams = new URLSearchParams();

        // Add all parameters to the query string
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, value);
            }
        });

        const response = await fetch(`${PLACEMENTS_API_BASE_URL}/placements?${queryParams.toString()}`, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            data: data.results || [],
            totalMatches: data.totalMatches || 0
        };
    } catch (error) {
        logError(error, 'fetchPlacementData');
        throw error;
    }
};

// --- Helper Functions for API formatting ---
const formatUniversityNameForAPI = (universityName) => { // UI "University"
    if (!universityName || typeof universityName !== 'string') return '';
    return universityName.toUpperCase() === 'ALL' ? 'ALL' : universityName.toUpperCase();
};
const formatProgramNameForAPI = (programName) => { // UI "Program"
    if (!programName || typeof programName !== 'string') return '';
    return programName.toUpperCase();
};
// No specific formatter needed for "Degree" if it's passed as is.

// --- Main App Component ---
const App = () => {
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const queryClient = useQueryClient();
    const [showSignIn, setShowSignIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userGroups, setUserGroups] = useState([]);
    const [userProfile, setUserProfile] = useState(() => {
        // ✅ Load userProfile synchronously from localStorage on initial render
        const cached = localStorage.getItem("userProfile");
        if (cached) {
            try {
                const parsed = JSON.parse(cached);

                console.log("⚡ Loaded userProfile synchronously from localStorage:", parsed);
                return parsed;
            } catch (e) {
                console.error("❌ Error parsing cached userProfile:", e);
            }
        }
        return null;
    });
    I18n.putVocabularies(customErrorMessages);
    I18n.setLanguage('en');
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [hasFetchedFreshProfile, setHasFetchedFreshProfile] = useState(false);
    const [cachedProfileLoaded, setCachedProfileLoaded] = useState(() => {
        // ✅ Set to true if we have cached data on initial load
        const cached = localStorage.getItem("userProfile");
        return !!cached;
    });

    // 🚀 NEW: Instant avatar state for ultra-fast loading
    const [instantAvatar, setInstantAvatar] = useState(() => {
        // Check cache first for existing users
        const cached = localStorage.getItem("userProfile");
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                return parsed.avatar || null;
            } catch (e) {
                console.warn("Error parsing cached avatar:", e);
                return null;
            }
        }
        return null;
    });



 useEffect(() => {
  if (user && !hasFetchedFreshProfile) {
    // ✅ Only show spinner if no cache was loaded AND user is signed in
    if (!cachedProfileLoaded && user) {
      setIsLoadingProfile(true);
    }

    // 🚀 NEW: Ultra-fast avatar lookup for existing users (Scenario 2)
    const performFastAvatarLookup = async () => {
      if (!instantAvatar) { // Only if we don't have cached avatar
        try {
          const email = user.attributes?.email?.toLowerCase();
          if (email) {
            const avatarResult = await getUserAvatarFast(email);

            if (avatarResult.exists && avatarResult.avatar) {
              // ✅ EXISTING USER: Show exact avatar instantly!
              setInstantAvatar(avatarResult.avatar);
              console.log('🚀 Fast avatar loaded:', avatarResult.avatar);
            }
          }
        } catch (error) {
          console.warn('Fast avatar lookup failed, continuing with normal flow:', error);
          // Continue with existing logic - no breaking changes
        }
      }
    };

    // Perform fast avatar lookup (non-blocking)
    performFastAvatarLookup();

    // ✅ EXISTING: Continue with full profile loading (unchanged)
    const cleanup = trackUserSession(user, (profile) => {
      if (profile?.email) {
        setUserProfile(profile); // ✅ Always update local state
        localStorage.setItem("userProfile", JSON.stringify(profile)); // ✅ Also refresh localStorage
        setHasFetchedFreshProfile(true); // ✅ Mark session complete
        setCachedProfileLoaded(true); // ✅ Mark as cached

        // Update instant avatar if it changed
        if (profile.avatar && profile.avatar !== instantAvatar) {
          setInstantAvatar(profile.avatar);
        }
      }

      setIsLoadingProfile(false);
    });

    return cleanup;
  }
}, [user, hasFetchedFreshProfile, cachedProfileLoaded, instantAvatar]);



    // Move async code to useEffect
    useEffect(() => {
      const checkAdminStatus = async () => {
        if (user) {
          try {

            
            // Get session with tokens
            const session = await fetchAuthSession();
            

            console.log('Full session:', session);
            console.log('Tokens:', session.tokens);
            
            // Check for groups in the access token
            const groups = session.tokens?.accessToken?.payload?.["cognito:groups"] || [];
            console.log('User groups:', groups);
            
            setUserGroups(groups);
            setIsAdmin(groups.includes("Admin"));
            
            
          } catch (error) {
            console.error('Error fetching session:', error);
            setIsAdmin(false);
            setUserGroups([]);
          }
        } else {
          setIsAdmin(false);
          setUserGroups([]);
        }
      };
  
      checkAdminStatus();
    }, [user]); // Run when user changes

    const defaultFilters = useMemo(() => ({
        degree: "PhD",           // UI: Degree
        program: "",             // UI: Program
        university: "",          // UI: University
        fromYear: "",           // UI: From Year
        toYear: "",             // UI: To Year
    }), []);
  
useEffect(() => {
  if (user) {
    setShowSignIn(false);
    
    // Reset sign-in prompt flag when user successfully signs in
    setHasShownSignInPrompt(false);
    localStorage.removeItem('hasShownSignInPrompt');
    
    // Clear old filters and fetch new ones when user signs in
    setFilters(defaultFilters); // clear old
    // now fetch new - this will automatically trigger the useQuery to refetch with authentication
    queryClient.invalidateQueries('allFiltersData');
    
    // ⏱️ Track session
let intervalId;

const startTracking = async () => {
  const cleanup = await trackUserSession(user, setUserProfile);
  intervalId = cleanup;
};

startTracking();

return () => {
  if (intervalId) intervalId();
};

  }
}, [user, defaultFilters, queryClient]);


    const [filters, setFilters] = useState(defaultFilters);
    // ... other state variables (placements, totalEntries, etc. - no change here)
    const [placements, setPlacements] = useState([]);
    const [totalEntries, setTotalEntries] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [isSearching, setIsSearching] = useState(false);
    const [noResults, setNoResults] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [selectedComparisonUniversities, setSelectedComparisonUniversities] = useState([]); // This will store descriptive names for table headers
    const [isComparisonLoading, setIsComparisonLoading] = useState(false);
    const [comparisonError, setComparisonError] = useState(null);

    // comparisonModalState stores data for each comparison row
    const [comparisonModalState, setComparisonModalState] = useState(() => ({
        items: [ // Each item will have a selectedProgram and selectedUniversity
            { id: Date.now(), selectedProgram: "", selectedUniversity: "" },
            { id: Date.now() + 1, selectedProgram: "", selectedUniversity: "" }
        ]
    }));

    const [reverseSearchResults, setReverseSearchResults] = useState([]);
    const [isReverseSearching, setIsReverseSearching] = useState(false);
    const [reverseSearchError, setReverseSearchError] = useState(null);
    const [hasReverseSearched, setHasReverseSearched] = useState(false);
    const [activeTab, setActiveTab] = useState("search");
    const [showTerms, setShowTerms] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [currentView, setCurrentView] = useState("main"); 
    const [showSignInPrompt, setShowSignInPrompt] = useState(false);
    const [hasShownSignInPrompt, setHasShownSignInPrompt] = useState(() => {
        return localStorage.getItem('hasShownSignInPrompt') === 'true';
    });

    
// 'main' or 'admin'




    const { data: allFilterData, isLoading: allFilterDataLoading, error: allFilterDataError } = useQuery(
        "allFiltersData", // Key for React Query
        fetchAllFilterData,    // Fetcher function
        {
            staleTime: Infinity, cacheTime: Infinity, retry: 1,
            onError: (error) => logError(error, 'fetchAllFiltersData Query'),
            placeholderData: [], useErrorBoundary: false
        }
    );

    const { data: allUniversities, isLoading: isUniversitiesLoading, error: universitiesError } = useQuery(
        "allUniversities",
        fetchAllUniversities,
        { staleTime: Infinity, cacheTime: Infinity, placeholderData: [] }
    );

    const { mutate: addUniversitiesMutation } = useMutation(addUniversities, {
        onMutate: async (newUniversities) => {
            await queryClient.cancelQueries('allUniversities');
            const previousUniversities = queryClient.getQueryData('allUniversities');
            
            const optimisticUniversities = newUniversities.map(uni => ({
                ...uni,
                id: `temp-${Date.now()}-${Math.random()}`,
                schoolCount: 0,
                isNew: true,
            }));

            queryClient.setQueryData('allUniversities', (old = []) => [...old, ...optimisticUniversities]);
            
            return { previousUniversities, optimisticUniversities };
        },
        onError: (err, newUniversities, context) => {
            queryClient.setQueryData('allUniversities', context.previousUniversities);
            toast.error('Failed to add universities. Reverting changes.');
        },
        onSuccess: (data, variables, context) => {
            queryClient.setQueryData('allUniversities', (old = []) => {
                const withoutOptimistic = old.filter(uni => !context.optimisticUniversities.some(opt => opt.id === uni.id));
                const serverUniversities = data.universities || [];
                return [...withoutOptimistic, ...serverUniversities];
            });
            toast.success(`${data.universities?.length || 0} universities added successfully!`);
        },
        onSettled: () => {
            queryClient.invalidateQueries('allUniversities');
        },
    });

    const handleAddUniversity = useCallback((universities) => {
        addUniversitiesMutation(universities);
    }, [addUniversitiesMutation]);

    const universityCountryMap = useMemo(() => {
        if (!allUniversities || allUniversities.length === 0) return new Map();
        return new Map(allUniversities.map(u => [u.name.toUpperCase(), u.country]));
    }, [allUniversities]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        
        // Add listener for navigation events
        const handleNavigation = (e) => {
          if (e.detail && e.detail.view) {
            setCurrentView(e.detail.view);
          }
        };
        window.addEventListener('navigate', handleNavigation);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('navigate', handleNavigation);
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'search' && placements.length > 0 && !isSearching) {
            const resultsElement = document.getElementById('placement-results-section');
            if (resultsElement) {
                setTimeout(() => resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
        }
    }, [placements, isSearching, activeTab]);

    useEffect(() => {
        if (activeTab === 'reverse' && reverseSearchResults.length > 0 && !isReverseSearching && hasReverseSearched) {
            const resultsElement = document.getElementById('reverse-search-results-section');
            if (resultsElement) {
                setTimeout(() => resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
        }
    }, [reverseSearchResults, isReverseSearching, activeTab, hasReverseSearched]);

    useEffect(() => {
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        let originalContent = viewportMeta ? viewportMeta.content : 'width=device-width, initial-scale=1.0';
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        return () => { if (viewportMeta) viewportMeta.content = originalContent; };
    }, []);

    // Show sign-in prompt for non-authenticated users after search (only once)
    useEffect(() => {
        if (getConfigValue('FEATURES.SHOW_SIGN_IN_PROMPT') && !user && placements.length > 0 && !isSearching && !hasShownSignInPrompt) {

            // Delay showing the popup slightly to let search results render
            const timer = setTimeout(() => {
                setShowSignInPrompt(true);
                setHasShownSignInPrompt(true);
                localStorage.setItem('hasShownSignInPrompt', 'true');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [user, placements.length, isSearching, hasShownSignInPrompt]);




    const handleAdminClick = useCallback(() => {
        setCurrentView("admin");
        window.scrollTo(0, 0); // Scroll to top when switching to admin view
    }, []);

    const handlePlacementViewClick = useCallback(() => {
        setCurrentView("main");
        // Optionally, reset to a default main tab, e.g., 'search'
        // setActiveTab("search"); 
        window.scrollTo(0, 0); // Scroll to top
    }, []);



    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => {
            const updatedFilters = { ...prev, [key]: value === undefined ? "" : String(value) }; // Ensure value is string
            if (key === "fromYear") {
                if (!value) updatedFilters.toYear = "";
                else if (prev.toYear && value > prev.toYear) updatedFilters.toYear = "";
            }
            if (key === "toYear" && prev.fromYear && value && value < prev.fromYear) return prev; // Invalid range
            return updatedFilters;
        });
    }, []);

    // Handles UI Discipline selection
    const handleDisciplineChange = useCallback((disciplineValue) => {
        const newDiscipline = disciplineValue || "";
        setFilters(prev => ({
            ...prev,
            discipline: newDiscipline,
            university: "", // Reset university for search tab
            program: ""    // Reset program for search tab
        }));

        // Reset comparison items as their context (available universities) has changed
        setComparisonModalState(prev => ({
            ...prev,
            items: prev.items.map(item => ({
                ...item,
                selectedProgram: "",
                selectedUniversity: "",
            }))
        }));

    }, []);

    // Handles UI University selection (for Search Tab)
    const handleUniversityChange = useCallback((universityValue) => {
        handleFilterChange("university", universityValue || "");
    }, [handleFilterChange]);

    // Handles UI Program selection (for Search Tab)
    const executeSearch = useCallback(async (searchFilters, page = 1) => {
        // Validation based on UI terms
        if (!searchFilters.program || !searchFilters.university) {
            return;
        }

        setIsSearching(true);
        setNoResults(false);
        setSearchError(null);
        if (page === 1) {
            setPlacements([]); setTotalEntries(0);
        }
        try {
            const apiParams = {
                degree: searchFilters.degree,
                program: searchFilters.program.toUpperCase(),
                university: searchFilters.university.toUpperCase(),
                fromYear: searchFilters.fromYear,
                toYear: searchFilters.toYear,
                page: page,
                limit: itemsPerPage
            };
            const { data, totalMatches } = await fetchPlacementData(apiParams);
            // ... (rest of search logic - sorting, setting state - no change here)
            if (data.length === 0 && page === 1) {
                setNoResults(true);
                setPlacements([]);
                setTotalEntries(0);
            } else {
                const sortedData = [...data].sort((a, b) => {
                    const yearDiff = Number(b.date) - Number(a.date);
                    if (yearDiff !== 0) return yearDiff;
                    const universityA = typeof a.college === 'string' ? a.college : ''; // API still returns "college" field
                    const universityB = typeof b.college === 'string' ? b.college : '';
                    return universityA.localeCompare(universityB);
                });
                setPlacements(sortedData);
                setTotalEntries(totalMatches);
                setCurrentPage(page);
                setNoResults(false);
            }
        } catch (error) {
            logError(error, 'executeSearch');
            setSearchError(`Search failed: ${error.message}`);
            setPlacements([]); setTotalEntries(0); setNoResults(true);
        } finally {
            setIsSearching(false);
        }
    }, [itemsPerPage]);


const handleSearchClick = useCallback(() => {
    setComparisonData(null);
    setCurrentPage(1);

    if (user?.username) {
        trackFeatureUsage(user.username, 'search'); // ✅ tracking usage
    }

    executeSearch(filters, 1);
}, [filters, executeSearch, user]);


    const handlePageChange = useCallback((newPage) => {
        // ... (no change here)
        if (newPage >= 1 && newPage <= Math.ceil(totalEntries / itemsPerPage) && newPage !== currentPage) {
            executeSearch(filters, newPage);
        }
    }, [filters, executeSearch, totalEntries, itemsPerPage, currentPage]);

    const handleReset = useCallback(() => {
        setFilters(defaultFilters);
        // ... reset other states (placements, comparison, reverse search)
        setPlacements([]);
        setTotalEntries(0);
        setCurrentPage(1);
        setNoResults(false);
        setSearchError(null);
        setSelectedComparisonUniversities([]);
        setComparisonError(null);
        // Reset comparison modal state to initial
        setComparisonModalState({
            items: [
                { id: Date.now(), selectedProgram: "", selectedUniversity: "" },
                { id: Date.now() + 1, selectedProgram: "", selectedUniversity: "" }
            ]
        });
        setReverseSearchResults([]);
        setReverseSearchError(null);
        setHasReverseSearched(false);
    }, [defaultFilters]);

    const handleAddComparisonItem = useCallback(() => {
        setComparisonModalState(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    id: Date.now(),
                    selectedProgram: "",
                    selectedUniversity: "",
                }
            ]
        }));
    }, []);

    const handleCompareModalChange = useCallback((index, key, value) => {
        setComparisonModalState(prev => {
            const newItems = [...prev.items];
            const currentItem = { ...newItems[index] };

            if (key === 'program') {
                currentItem.selectedProgram = value || "";
                currentItem.selectedUniversity = ""; // Reset university when program changes
            } else if (key === 'university') {
                currentItem.selectedUniversity = value || "";
            }

            newItems[index] = currentItem;
            return { ...prev, items: newItems };
        });
    }, []);

    const handleRemoveComparisonItem = useCallback((indexToRemove) => {
        setComparisonModalState(prev => ({
            ...prev,
            items: prev.items.filter((_, index) => index !== indexToRemove)
        }));
    }, []);

    const executeCompare = useCallback(async () => {
        const itemsToCompare = comparisonModalState.items.filter(item => item.selectedProgram && item.selectedUniversity);

        if (itemsToCompare.length < 2) {
            setComparisonError("Please select at least two Program-University combinations to compare.");
            return;
        }
        // Check for unique program-university combinations
        const uniqueCombos = new Set(
            itemsToCompare.map(item => `${item.selectedProgram.toUpperCase()}-${item.selectedUniversity.toUpperCase()}`)
        );
        if (uniqueCombos.size !== itemsToCompare.length) {
            setComparisonError("Each Program-University combination can only be selected once for comparison.");
            return;
        }

        setIsComparisonLoading(true);
        setComparisonError(null);
        setComparisonData(null);

        const descriptiveNames = itemsToCompare.map(item => {
            return `${item.selectedProgram} - ${item.selectedUniversity}`;
        });
        setSelectedComparisonUniversities(descriptiveNames);

        try {
            const promises = itemsToCompare.map(item =>
                fetchPlacementData({
                    degree: "PhD",
                    program: item.selectedProgram.toUpperCase(),
                    university: item.selectedUniversity.toUpperCase(),
                    fromYear: filters.fromYear || "",
                    toYear: filters.toYear || "",
                    page: 1, limit: 100
                }).then(result => ({
                    program: item.selectedProgram,
                    university: item.selectedUniversity,
                    data: result.data, totalMatches: result.totalMatches, error: null
                })).catch(error => ({
                    program: item.selectedProgram,
                    university: item.selectedUniversity,
                    data: [], totalMatches: 0,
                    error: `Failed for ${item.selectedProgram} - ${item.selectedUniversity}: ${error.message}`
                }))
            );
            const results = await Promise.all(promises);
            const comparisonResultData = {};
            let hasAnyData = false, hasAnyError = false;

            results.forEach((res, index) => {
                const key = descriptiveNames[index];
                const originalItem = itemsToCompare[index];
                comparisonResultData[key] = {
                    data: res.data, totalMatches: res.totalMatches,
                    selectedProgram: originalItem.selectedProgram,
                    selectedUniversity: originalItem.selectedUniversity,
                    error: res.error
                };
                if (res.data && res.data.length > 0) hasAnyData = true;
                if (res.error) hasAnyError = true;
            });

            if (!hasAnyData && !hasAnyError) setComparisonError("No placement data found for the selected criteria.");
            else if (!hasAnyData && hasAnyError) setComparisonError("Could not load data for any selection. Check errors below.");
            else {
                
                setTimeout(() => {
                    const resultsElement = document.getElementById('comparison-results-section');
                    if (resultsElement) resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
                if (user?.username) {
  trackFeatureUsage(user.username, 'compare');
}


            }
            
            setComparisonData(comparisonResultData);

        } catch (error) {
            logError(error, 'executeCompare');
            setComparisonError(`An unexpected error occurred: ${error.message}`);
        } finally {
            setIsComparisonLoading(false);
        }
    }, [comparisonModalState.items, filters.fromYear, filters.toYear]);


    const handleClearComparison = useCallback(() => { /* ... (no change here) ... */
        setComparisonData(null);
        setSelectedComparisonUniversities([]);
        setComparisonError(null);
    }, []);

    const executeReverseSearch = useCallback(async (institutionName) => {
        if (!filters.program || !institutionName?.trim()) return;

        setIsReverseSearching(true);
        setReverseSearchError(null);
        setHasReverseSearched(true);
        setReverseSearchResults([]);
        try {
            const apiParams = {
                institution: institutionName.trim().toUpperCase(),
                program: filters.program.toUpperCase(),
                fromYear: filters.fromYear || "",
                toYear: filters.toYear || "",
                degree: "PhD"
            };
            const response = await fetchPlacementDetails(apiParams);
            if (response.success) {
                if (response.data.length > 0) {
                    const sortedData = [...response.data].sort((a, b) => {
                        const yearDiff = Number(b.date) - Number(a.date);
                        if (yearDiff !== 0) return yearDiff;
                        const nameA = typeof a.graduate === 'string' ? a.graduate : '';
                        const nameB = typeof b.graduate === 'string' ? b.graduate : '';
                        return nameA.localeCompare(nameB);
                    });
                    setReverseSearchResults(sortedData);
                } else {
                    setReverseSearchError(response.message || "No graduates found.");
                }
            } else {
                setReverseSearchError(response.message || "Reverse search failed.");
            }
        } catch (error) {
            logError(error, 'executeReverseSearch');
            setReverseSearchError(`Reverse search failed: ${error.message}`);
        } finally {
            setIsReverseSearching(false);
        }
    }, [filters.program, filters.fromYear, filters.toYear]);

    // ... handleTabChange, handleTermsClick, handleBackToApp, totalPages, availableYears (no change) ...
    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
        setSearchError(null);
        setComparisonError(null);
        setReverseSearchError(null);
        setNoResults(false);
    }, []);

    const handleTermsClick = (e) => { e.preventDefault(); setShowTerms(true); window.scrollTo(0, 0); };
    const handleBackToApp = () => setShowTerms(false);
    const totalPages = useMemo(() => Math.ceil(totalEntries / itemsPerPage), [totalEntries, itemsPerPage]);
    const availableYears = useMemo(() => STATIC_FILTER_OPTIONS.years, []);


    // --- Derived Filter Options (using UI terms) ---
    // Options for UI Discipline dropdown

    const fromYearOptions = useMemo(() => { /* ... (no change) ... */
        const toYearNum = filters.toYear ? Number(filters.toYear) : Infinity;
        const validYears = availableYears.filter(year => year <= toYearNum);
        return formatSelectOptions(validYears.sort((a, b) => b - a), true, "ALL");
    }, [filters.toYear, availableYears]);
    const toYearOptions = useMemo(() => { /* ... (no change) ... */
        const fromYearNum = filters.fromYear ? Number(filters.fromYear) : 0;
        const validYears = availableYears.filter(year => year >= fromYearNum);
        return formatSelectOptions(validYears.sort((a, b) => b - a), true, "ALL");
    }, [filters.fromYear, availableYears]);

    // Update the searchProgramOptions to use the hierarchical structure
    const searchProgramOptions = useMemo(() => {
        if (!allFilterData || !Array.isArray(allFilterData) || allFilterData.length === 0) {
            console.log('searchProgramOptions - allFilterData:', allFilterData);
            console.log('No filter data available for programs');
            return formatSelectOptions([], true, "SELECT PROGRAM...");
        }

        // Get programs from the PhD degree
        const programs = allFilterData[0].universities.flatMap(uni => uni.programs);
        console.log('Available programs:', programs);

        const options = formatSelectOptions([...new Set(programs)], true, "SELECT PROGRAM...");
        console.log('Program options:', options);
        return options;
    }, [allFilterData]);

    // Update the searchUniversityOptions to use the hierarchical structure
    const searchUniversityOptions = useMemo(() => {
        console.log('searchUniversityOptions - allFilterData:', allFilterData);
        console.log('searchUniversityOptions - filters:', filters);

        if (!allFilterData || !Array.isArray(allFilterData) || allFilterData.length === 0 || !filters.program) {
            console.log('No filter data or program selected for universities');
            return formatSelectOptions([], true, "SELECT UNIVERSITY...");
        }

        // Get universities for the selected program
        const universitiesForProgram = allFilterData[0].universities.filter(
            uni => uni.programs.includes(filters.program)
        );
        console.log('Selected program universities:', universitiesForProgram);

        if (!universitiesForProgram || universitiesForProgram.length === 0) {
            console.log('No universities found for selected program');
            return formatSelectOptions([], true, "SELECT UNIVERSITY...");
        }

        const universities = universitiesForProgram.map(uni => uni.university);
        console.log('Available universities:', universities);

        const options = formatSelectOptions(universities, true, "SELECT UNIVERSITY...");
        console.log('University options:', options);
        return options;
    }, [allFilterData, filters.program]);

    // Update the handleProgramChange to reset university when program changes
    const handleProgramChange = useCallback((programValue) => {
        const newProgram = programValue || "";
        setFilters(prev => ({
            ...prev,
            program: newProgram,
            university: "" // Reset university when program changes
        }));
    }, []);

    // --- UI Components ---
    const SignInPromptPopup = ({ isVisible, onClose, onSignIn }) => {
        if (!isVisible) return null;

        return (
            <div className="signin-prompt-overlay" onClick={onClose}>
                <div className="signin-prompt-container" onClick={e => e.stopPropagation()}>
                    <div className="curved-arrow">
                        <svg viewBox="0 0 100 60" className="arrow-svg">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                                 refX="10" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#1a6985" />
                                </marker>
                            </defs>
                            <path d="M 10 50 Q 50 10, 90 30" stroke="#1a6985" strokeWidth="3" 
                                  fill="none" markerEnd="url(#arrowhead)" className="arrow-path" />
                        </svg>
                    </div>
                    <div className="signin-prompt-popup">
                        <div className="popup-icon">🚀</div>
                        <h3>Unlock More Data!</h3>
                        <p>Sign in to access our complete database of PhD placements and get deeper insights into academic career paths.</p>
                        <div className="popup-benefits">
                            <div className="benefit-item">
                                <span className="benefit-icon">📊</span>
                                <span>Access to premium placement data</span>
                            </div>
                            <div className="benefit-item">
                                <span className="benefit-icon">🔍</span>
                                <span>Advanced search filters</span>
                            </div>
                            <div className="benefit-item">
                                <span className="benefit-icon">💼</span>
                                <span>Industry-specific insights</span>
                            </div>
                        </div>
                        <div className="popup-buttons">
                            <button className="popup-signin-btn" onClick={onSignIn}>
                                Sign In to Continue
                            </button>
                            <button className="popup-close-btn" onClick={onClose}>
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const TabSelector = ({ activeTab, onTabChange }) => (
        <div className="tabs">
            {[
                { id: "search", label: "Search" },
                { id: "comparison", label: "Compare" },
                { id: "reverse", label: "Reverse Search" }
            ].map(tab => (
                <div key={tab.id} className="tab-wrapper">
                    <button
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        {tab.label}
                    </button>
                </div>
            ))}
        </div>
    );

    const CommonFilters = () => (
        <div className="common-filters card">
            <div className="filter-row">
                <div className="filter-container">
                    <label htmlFor="programName-select" className="dropdown-label">Degree</label>
                    <Select
                        inputId="programName-select"
                        value={{ value: "PhD", label: "PhD" }}
                        options={[{ value: "PhD", label: "PhD" }]}
                        isDisabled={true}
                        styles={selectStyles}
                        isSearchable={false}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        aria-label="Program (fixed to PhD)"
                    />
                </div>
                <div className="filter-container">
                    <label htmlFor="from-year-select" className="dropdown-label">From Year</label>
                    <Select
                        inputId="from-year-select"
                        value={getSelectValue(fromYearOptions, filters.fromYear)}
                        onChange={(selected) => handleFilterChange("fromYear", selected?.value)}
                        options={fromYearOptions}
                        styles={selectStyles}
                        placeholder="ALL"
                        isSearchable={true}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        isLoading={false}
                        isDisabled={false}
                        isClearable={true}
                        aria-label="Select Start Year"
                    />
                </div>
                <div className="filter-container">
                    <label htmlFor="to-year-select" className="dropdown-label">To Year</label>
                    <Select
                        inputId="to-year-select"
                        value={getSelectValue(toYearOptions, filters.toYear)}
                        onChange={(selected) => handleFilterChange("toYear", selected?.value)}
                        options={toYearOptions}
                        styles={selectStyles}
                        placeholder="ALL"
                        isSearchable={true}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        isLoading={false}
                        isDisabled={!filters.fromYear}
                        isClearable={true}
                        aria-label="Select End Year"
                    />
                </div>
            </div>
        </div>
    );

    const SearchTabContent = () => (
        <>
            <div className="search-specific-filters card">
                <h4>Search</h4>
                <div className="filter-row">
                    <div className="filter-container filter-program">
                        <label htmlFor="program-select" className="dropdown-label">Program</label>
                        <Select
                            inputId="program-select"
                            value={getSelectValue(searchProgramOptions, filters.program)}
                            onChange={(selected) => handleProgramChange(selected?.value)}
                            options={searchProgramOptions}
                            styles={selectStyles}
                            placeholder="Select program..."
                            isSearchable={true}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            isLoading={allFilterDataLoading}
                            isDisabled={allFilterDataLoading}
                            aria-label="Select Program"
                        />
                    </div>
                    <div className="filter-container filter-university">
                        <label htmlFor="university-select" className="dropdown-label">University</label>
                        <Select
                            inputId="university-select"
                            value={getSelectValue(searchUniversityOptions, filters.university)}
                            onChange={(selected) => handleUniversityChange(selected?.value)}
                            options={searchUniversityOptions}
                            styles={selectStyles}
                            placeholder="Select university..."
                            isSearchable={true}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            isLoading={allFilterDataLoading}
                            isDisabled={allFilterDataLoading || !filters.program}
                            aria-label="Select University"
                        />
                    </div>
                </div>
                <div className="button-group action-buttons">
                    <button
                        className="button button-primary search-button"
                        onClick={handleSearchClick}
                        disabled={isSearching || !filters.program || !filters.university}
                        aria-busy={isSearching}
                    >
                        {isSearching ? "Searching..." : "Search"}
                    </button>
                    <button className="button button-secondary reset-button" onClick={handleReset}>Reset</button>
                </div>
            </div>
            {searchError && <p className="error-message minimal">{searchError}</p>}
            {noResults && !isSearching && !searchError && (
                <p className="info-message card">No placement data found for your current filter selection.</p>
            )}
            {placements.length > 0 && !isSearching && (
                <div id="placement-results-section" className="results-section card">
                    <Suspense fallback={<div className="loading-indicator">Loading...</div>}>
                        <PlacementList data={placements} isMobile={isMobile} />
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            isDisabled={isSearching}
                            totalEntries={totalEntries}
                            itemsPerPage={itemsPerPage}
                        />
                    </Suspense>
                </div>
            )}
            {isSearching && placements.length === 0 && (
                <div className="loading-indicator minimal">Searching...</div>
            )}
        </>
    );

    const ComparisonItemRow = ({
        item, index, allFilterData,
        onModalChange, onRemove, isRemovable, allFilterDataLoading,
        comparisonModalState
    }) => {
        // Get all selected program-university combinations except the current one
        const selectedCombos = useMemo(() => {
            return comparisonModalState.items
                .filter((otherItem, otherIndex) => otherIndex !== index && otherItem.selectedProgram && otherItem.selectedUniversity)
                .map(otherItem => `${otherItem.selectedProgram}-${otherItem.selectedUniversity}`);
        }, [comparisonModalState.items, index]);

        // Options for this item's Program dropdown
        const programOptions = useMemo(() => {
            if (allFilterDataLoading || !allFilterData) {
                return [{ value: "", label: "Loading Programs..." }];
            }

            // Get all programs from all universities
            const allPrograms = Array.isArray(allFilterData) && allFilterData[0] && allFilterData[0].universities ? 
                allFilterData[0].universities.reduce((acc, university) => {
                    if (university.programs && Array.isArray(university.programs)) {
                        university.programs.forEach(program => {
                            if (!acc.includes(program)) {
                                acc.push(program);
                            }
                        });
                    }
                    return acc;
                }, []) : [];

            if (allPrograms.length === 0) {
                return [{ value: "", label: "No programs available" }];
            }

            const formatted = formatSelectOptions(allPrograms, true, "SELECT PROGRAM...");
            return formatted;
        }, [allFilterData, allFilterDataLoading]);

        // Options for this item's University dropdown
        const universityOptions = useMemo(() => {
            if (allFilterDataLoading || !allFilterData || !item.selectedProgram) {
                return [{ value: "", label: "SELECT UNIVERSITY..." }];
            }

            // Get universities that have the selected program
            const universitiesWithProgram = allFilterData[0].universities.filter(uni =>
                uni.programs.includes(item.selectedProgram)
            );

            if (universitiesWithProgram.length === 0) {
                return [{ value: "", label: "No universities available for this program" }];
            }

            // Filter out universities that are already selected in other rows with the same program
            const availableUniversities = universitiesWithProgram.filter(uni => {
                // If this row has a selected university, keep it
                if (uni.university === item.selectedUniversity) return true;

                // Check if this university is used in any other selected combination with the same program
                return !selectedCombos.some(combo => combo === `${item.selectedProgram}-${uni.university}`);
            });

            const universityNames = availableUniversities.map(uni => uni.university);
            const formatted = formatSelectOptions(universityNames, true, "SELECT UNIVERSITY...").map(option => {
                if (!option.value || !APP_CONFIG.SHOW_COUNTRY_CODE) return option;
                const country = universityCountryMap.get(option.value.toUpperCase());
                const code = country ? COUNTRY_CODES[country.toUpperCase()] : '';
                const label = code ? `${option.label} (${code})` : option.label;
                return { ...option, label };
            });
            return formatted;
        }, [allFilterData, allFilterDataLoading, item.selectedProgram, item.selectedUniversity, selectedCombos, universityCountryMap]);

        return (
            <div className="comparison-item-row" style={{ position: "relative" }}>
                <div className="comparison-item-inputs">
                    <div className="filter-container">
                        <label htmlFor={`compare-program-${index}`} className="dropdown-label">Program</label>
                        <Select
                            inputId={`compare-program-${index}`}
                            value={getSelectValue(programOptions, item.selectedProgram)}
                            onChange={(selected) => onModalChange(index, 'program', selected?.value)}
                            options={programOptions}
                            styles={selectStyles}
                            placeholder={programOptions[0]?.label || "SELECT PROGRAM..."}
                            isLoading={allFilterDataLoading && programOptions.length <= 1 && programOptions[0]?.label.startsWith("Loading")}
                            isDisabled={allFilterDataLoading || (programOptions.length <= 1 && !programOptions[0]?.label.startsWith("Loading"))}
                            className="react-select-container"
                            classNamePrefix="react-select"
                        />
                    </div>
                    <div className="filter-container">
                        <label htmlFor={`compare-university-${index}`} className="dropdown-label">University</label>
                        <Select
                            inputId={`compare-university-${index}`}
                            value={getSelectValue(universityOptions, item.selectedUniversity)}
                            onChange={(selected) => onModalChange(index, 'university', selected?.value)}
                            options={universityOptions}
                            styles={selectStyles}
                            placeholder={universityOptions[0]?.label || "SELECT UNIVERSITY..."}
                            isLoading={allFilterDataLoading && universityOptions.length <= 1 && universityOptions[0]?.label.startsWith("Loading")}
                            isDisabled={allFilterDataLoading || !item.selectedProgram || (universityOptions.length <= 1 && !universityOptions[0]?.label.startsWith("Loading"))}
                            className="react-select-container"
                            classNamePrefix="react-select"
                        />
                    </div>
                </div>
                {isRemovable && (
                    <button
                        className="remove-comparison-item"
                        onClick={() => onRemove(index)}
                        aria-label="Remove comparison item"
                        style={{
                            position: 'absolute',
                            right: '-30px',
                            top: '0',
                            transform: 'translateY(-50%)',
                            background: '#fff',
                            border: '1px solid #ffcdd2',
                            fontSize: '20px',
                            color: '#ef5350',
                            cursor: 'pointer',
                            padding: '5px',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            zIndex: 1,
                            ':hover': {
                                backgroundColor: '#ffebee',
                                color: '#e53935',
                                boxShadow: '0 3px 6px rgba(0,0,0,0.15)'
                            }
                        }}
                    >
                        ×
                    </button>
                )}
            </div>
        );
    };

    const ComparisonTabContent = () => (
        <div className="comparison-tab card">
            <h4>Compare Universities & Programs</h4>
            <p className="tab-description">
            </p>
            <div className="comparison-filters">
                {comparisonModalState.items.map((item, index) => (
                    <ComparisonItemRow
                        key={item.id}
                        item={item} // item contains { id, selectedProgram, selectedUniversity }
                        index={index}
                        allFilterData={allFilterData} // Pass all data for lookups
                        onModalChange={handleCompareModalChange}
                        onRemove={handleRemoveComparisonItem}
                        isRemovable={comparisonModalState.items.length > 2} // Allow removing if more than 2 items
                        allFilterDataLoading={allFilterDataLoading}
                        comparisonModalState={comparisonModalState}
                    />
                ))}
                <div className="comparison-actions">

                    <button
                        className="button button-primary compare-button"
                        onClick={executeCompare}
                        disabled={isComparisonLoading || comparisonModalState.items.filter(i => i.selectedProgram && i.selectedUniversity).length < 2}
                        aria-busy={isComparisonLoading}
                    >
                        {isComparisonLoading ? "Comparing..." : "Compare"}
                    </button>
                    <button className="button button-secondary add-item-button" onClick={handleAddComparisonItem}>
                        + Add University/Program for Comparison
                    </button>
                </div>
                {comparisonError && <div className="error-message">{comparisonError}</div>}
            </div>
            {isComparisonLoading && !comparisonData && <div className="loading-indicator card">Loading comparison data...</div>}
            {comparisonData && (
                <div id="comparison-results-section" className="results-section card">
                    <Suspense fallback={<div className="loading-indicator">Loading Table...</div>}>
                        <ComparisonTable
                            data={comparisonData}
                            universities={selectedComparisonUniversities}
                            isMobile={isMobile}
                            isProgramComparison={true}
                            universityCountryMap={universityCountryMap}
                            countryCodes={COUNTRY_CODES}
                        />
                        <div className="comparison-clear-action">
                            <button className="button button-secondary" onClick={handleClearComparison} disabled={isComparisonLoading}>
                                Clear Comparison Results
                            </button>
                        </div>
                    </Suspense>
                </div>
            )}
        </div>
    );

    const ReverseSearchTabContent = () => {
        const [institutionInput, setInstitutionInput] = useState("");
        const handleReverseSubmit = (e) => {
            e.preventDefault();
            executeReverseSearch(institutionInput);
        };
        const handleResetReverse = () => {
            setInstitutionInput("");
            setReverseSearchResults([]);
            setReverseSearchError(null);
            setHasReverseSearched(false);
        };

        return (
            <div className="reverse-search-tab card">
                <h4>Reverse Search</h4>
                <p className="tab-description"></p>
                <form onSubmit={handleReverseSubmit} className="reverse-search-form">
                    <div className="filter-row">
                        <div className="filter-container filter-program">
                            <label htmlFor="program-select" className="dropdown-label">Program</label>
                            <Select
                                inputId="program-select"
                                value={getSelectValue(searchProgramOptions, filters.program)}
                                onChange={(selected) => handleProgramChange(selected?.value)}
                                options={searchProgramOptions}
                                styles={selectStyles}
                                placeholder="Select program..."
                                isSearchable={true}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                isLoading={allFilterDataLoading}
                                isDisabled={allFilterDataLoading}
                                aria-label="Select Program"
                            />
                            {!filters.program && <span className="filter-hint">Please select a Program to enable reverse search.</span>}
                        </div>
                        <div className="filter-container">
                            <label htmlFor="institution-input" className="dropdown-label">Hiring Institution Name</label>
                            <input
                                id="institution-input"
                                type="text"
                                value={institutionInput}
                                onChange={(e) => setInstitutionInput(e.target.value)}
                                placeholder="e.g., Harvard University, Google, Federal Reserve Board"
                                className="text-input"
                                required
                                aria-required="true"
                                style={{ width: '100%' }}
                            />
                            <span className="filter-hint">Enter the full name of the hiring institution.</span>
                        </div>
                    </div>
                    <div className="button-group action-buttons">
                        <button
                            type="submit"
                            className="button button-primary search-button"
                            disabled={isReverseSearching || !institutionInput.trim() || !filters.program}
                            aria-busy={isReverseSearching}
                        >
                            {isReverseSearching ? "Searching..." : "Find Graduates"}
                        </button>
                        <button
                            type="button"
                            className="button button-secondary reset-button"
                            onClick={handleResetReverse}
                        >
                            Reset
                        </button>
                    </div>
                </form>
                <div className="messages-container">
                    {reverseSearchError && <p className="error-message">{reverseSearchError}</p>}
                </div>
                {isReverseSearching && <div className="loading-indicator card">Searching graduates...</div>}
                {hasReverseSearched && !isReverseSearching && (
                    <div id="reverse-search-results-section" className="results-section card">
                        {reverseSearchResults.length > 0 ? (
                            <PlacementList 
                                data={reverseSearchResults} 
                                isMobile={isMobile} 
                                isReverseSearch={true} 
                                universityCountryMap={universityCountryMap}
                                countryCodes={COUNTRY_CODES}
                            />
                        ) : (!reverseSearchError && <p className="info-message">No graduates found for "{institutionInput}" with the current filters.</p>)}
                    </div>
                )}
            </div>
        );
    };

    // --- Main Render ---
    if (showTerms) return <TermsAndConditions onBack={handleBackToApp} />;

    return (
  <ErrorBoundary>
    <DropdownProvider>
      <Router>
        <div className={`app-container ${currentView === 'admin' ? 'admin-view-active' : ''} mobile-responsive`}>

          <Header
            onPlacementClick={handlePlacementViewClick}
            onAdminClick={handleAdminClick}
            onTicketsClick={() => setCurrentView("tickets")}
            isAdmin={isAdmin}
            currentView={currentView}
            isLoadingProfile={isLoadingProfile}
            user={user}
            userProfile={userProfile}
            instantAvatar={instantAvatar}
            onSignInClick={async () => {
              await signOut();                        // ✅ Ends session
              setUserProfile(null);                   // ✅ Clear user profile
              setShowSignIn(true);                    // ✅ Show login
              setHasFetchedFreshProfile(false);       // ✅ Allow refetch of fresh profile
              setCachedProfileLoaded(false);          // ✅ Allow refetch of cached profile
            }}
          />

          <main className="main-content mobile-responsive">
            <Routes>
              <Route path="/admin/program-view/:id" element={<ProgramViewPage />} />

              <Route path="/admin/department-view/:id" element={<DepartmentView />} />


              <Route
                path="/"
                element={
                  currentView === 'admin' ? (
                    <AdminComponent
                      onNavigateBack={handlePlacementViewClick}
                      universitiesData={allUniversities}
                      isLoading={isUniversitiesLoading}
                      error={universitiesError}
                      onAddUniversity={handleAddUniversity}
                    />
                  ) : currentView === 'tickets' ? (
                    <Tickets user={user} userProfile={userProfile} />
                  ) : (
                    <>
                      {allFilterDataLoading && (!allFilterData || allFilterData.length === 0) && (
                        <div className="loading-indicator card">Loading filter options...</div>
                      )}

                      {allFilterDataError && (
                        <div className="error-message card">
                          Error loading filter options: {allFilterDataError.message}. Some filters may be unavailable.
                        </div>
                      )}

                      {(allFilterData || allFilterDataError) && <CommonFilters />}
                      <div className="tabs-wrapper">
                        <TabSelector activeTab={activeTab} onTabChange={handleTabChange} />
                      </div>

                      <div className="tab-content">
                        {activeTab === 'search' && (allFilterData || allFilterDataError) && <SearchTabContent />}
                        {activeTab === 'comparison' && (allFilterData || allFilterDataError) && <ComparisonTabContent />}
                        {activeTab === 'reverse' && (allFilterData || allFilterDataError) && <ReverseSearchTabContent />}
                      </div>
                    </>
                  )
                }
              />
            </Routes>
          </main>

          <footer className="app-footer">
            <div className="footer-content">
              <p className="footer-copyright">© {new Date().getFullYear()} PandainUniv</p>
              <nav className="footer-links">
                <a href="#" onClick={handleTermsClick}>Terms of Use</a>
                <a href="mailto:pandainuniv@gmail.com">Contact</a>
                <a
                  href="https://x.com/pandainuniv"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <img src="/x-logo.png" alt="Twitter" style={{ height: '1em', width: 'auto', marginRight: '0.35em' }} />
                  Twitter
                </a>
                <a
                  href="https://www.reddit.com/r/pandainuniv/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <img src="/reddit-logo.png" alt="Reddit" style={{ height: '1.5em', width: '1.5em', marginRight: '0.35em' }} />
                  Reddit
                </a>
              </nav>
            </div>
          </footer>
        </div>

        {/* Sign-in Prompt Popup */}
        <SignInPromptPopup 
            isVisible={showSignInPrompt && !user}
            onClose={() => setShowSignInPrompt(false)}
            onSignIn={() => {
                setShowSignInPrompt(false);
                setShowSignIn(true);
            }}
        />

        {/* ✅ Auth modal triggered on sign out */}
        {showSignIn && !user && (
          <div 
            className="auth-modal"
            onClick={(e) => {
              // Close modal when clicking on backdrop
              if (e.target === e.currentTarget) {
                setShowSignIn(false);
              }
            }}
          >
            <CustomAuthenticator onClose={() => setShowSignIn(false)} />
          </div>
        )}

        <ToastContainer />
      </Router>
    </DropdownProvider>
  </ErrorBoundary>
);

};

const PaginationControls = ({ currentPage, totalPages, onPageChange, isDisabled, totalEntries, itemsPerPage }) => { /* ... (no change) ... */
    if (totalPages <= 1) return null;
    const handlePrev = () => onPageChange(currentPage - 1);
    const handleNext = () => onPageChange(currentPage + 1);
    const handlePageClick = (page) => onPageChange(page);
    const startEntry = Math.min((currentPage - 1) * itemsPerPage + 1, totalEntries);
    const endEntry = Math.min(currentPage * itemsPerPage, totalEntries);
    const getPageNumbers = () => {
        const pages = []; const maxVisible = 5;
        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            const startPage = Math.max(2, currentPage - Math.floor((maxVisible - 3) / 2));
            const endPage = Math.min(totalPages - 1, startPage + maxVisible - 3);
            if (startPage > 2) pages.push('...');
            for (let i = startPage; i <= endPage; i++) pages.push(i);
            if (endPage < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        } return pages;
    };
    return (
        <div className="pagination-container">
            <div className="pagination-info">Showing {startEntry} - {endEntry} of {totalEntries} results</div>
            <div className="pagination-buttons">
                <button onClick={handlePrev} disabled={isDisabled || currentPage === 1} className="button button-secondary pagination-button prev" aria-label="Previous Page">Prev</button>
                {getPageNumbers().map((page, index) => page === '...' ? (<span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>) : (
                    <button key={page} onClick={() => handlePageClick(page)} disabled={isDisabled || currentPage === page} className={`button pagination-button page-number ${currentPage === page ? 'active' : ''}`} aria-label={`Go to page ${page}`} aria-current={currentPage === page ? 'page' : undefined}>{page}</button>
                ))}
                <button onClick={handleNext} disabled={isDisabled || currentPage === totalPages} className="button button-secondary pagination-button next" aria-label="Next Page">Next </button>
            </div>
        </div>
    );
};

export default React.memo(App);
