// src/utils/location.js

export const fetchUserLocation = async () => {
  const oneDay = 24 * 60 * 60 * 1000;
  const cached = localStorage.getItem('userLocation');

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < oneDay) {
        return parsed.value; // ✅ Use cached value
      }
    } catch (err) {
      console.warn("⚠️ Failed to parse cached location, fetching new.");
    }
  }

  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("Failed to fetch location");

    const data = await res.json();
    const location = `${data.city || 'Unknown'}, ${data.country_name || 'Unknown'}`;

    // ✅ Save to cache
    localStorage.setItem('userLocation', JSON.stringify({
      value: location,
      timestamp: Date.now()
    }));

    return location;
  } catch (err) {
    console.error("❌ Failed to fetch location:", err);
    return "Unknown";
  }
};
