// Test script to verify country configuration functionality
import { getConfigValue, setConfigValue } from './src/config.js';
import { COUNTRY_CODES } from './src/data/countries.js';

console.log('Testing Country Configuration...');

// Test 1: Check initial config value
console.log('1. Initial SHOW_COUNTRY_CODE value:', getConfigValue('SHOW_COUNTRY_CODE'));

// Test 2: Test setting the config value
console.log('2. Setting SHOW_COUNTRY_CODE to true...');
setConfigValue('SHOW_COUNTRY_CODE', true);
console.log('   New value:', getConfigValue('SHOW_COUNTRY_CODE'));

// Test 3: Test country code mapping
console.log('3. Testing country code mapping:');
const testCountries = ['UNITED STATES', 'UNITED KINGDOM', 'GERMANY', 'CANADA', 'AUSTRALIA'];
testCountries.forEach(country => {
  const code = COUNTRY_CODES[country.toUpperCase()];
  console.log(`   ${country}: ${code || 'NOT FOUND'}`);
});

// Test 4: Test formatted university name function (simulated)
const formatUniversityNameTest = (name, country, showCountryCode) => {
  if (!name) return '';
  if (!showCountryCode || !country) {
    return name;
  }
  const code = COUNTRY_CODES[country.toUpperCase()];
  return code ? `${name} (${code})` : name;
};

console.log('4. Testing formatted university names:');
const testUniversities = [
  { name: 'Harvard University', country: 'UNITED STATES' },
  { name: 'University of Oxford', country: 'UNITED KINGDOM' },
  { name: 'University of Toronto', country: 'CANADA' },
];

testUniversities.forEach(uni => {
  const withCode = formatUniversityNameTest(uni.name, uni.country, true);
  const withoutCode = formatUniversityNameTest(uni.name, uni.country, false);
  console.log(`   ${uni.name}:`);
  console.log(`     With code: ${withCode}`);
  console.log(`     Without code: ${withoutCode}`);
});

// Test 5: Reset config
console.log('5. Resetting SHOW_COUNTRY_CODE to false...');
setConfigValue('SHOW_COUNTRY_CODE', false);
console.log('   Final value:', getConfigValue('SHOW_COUNTRY_CODE'));

console.log('Country configuration test completed!');
