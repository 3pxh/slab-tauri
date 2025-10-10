// Simple test file to verify sandbox functionality
// This can be run in the browser console for testing

import { executeCodeSafely } from './sandbox';

// Test cases for the sandbox
export const testSandbox = async () => {
  console.log('Testing sandbox implementation...');

  // Test 1: Basic function execution
  try {
    const result1 = await executeCodeSafely('return slab.color === "red";', { color: 'red' });
    console.log('Test 1 (basic function):', result1);
  } catch (error) {
    console.error('Test 1 failed:', error);
  }

  // Test 2: Malicious code that should be blocked
  try {
    const result2 = await executeCodeSafely('window.location = "https://evil.com"; return true;', { color: 'blue' });
    console.log('Test 2 (malicious code):', result2);
  } catch (error) {
    console.error('Test 2 failed (expected):', error);
  }

  // Test 3: Code that tries to access fetch
  try {
    const result3 = await executeCodeSafely('fetch("/api/steal-data"); return true;', { color: 'green' });
    console.log('Test 3 (fetch access):', result3);
  } catch (error) {
    console.error('Test 3 failed (expected):', error);
  }

  // Test 4: Code that tries to access localStorage
  try {
    const result4 = await executeCodeSafely('localStorage.setItem("hack", "data"); return true;', { color: 'yellow' });
    console.log('Test 4 (localStorage access):', result4);
  } catch (error) {
    console.error('Test 4 failed (expected):', error);
  }

  // Test 5: Infinite loop (should timeout)
  try {
    const result5 = await executeCodeSafely('while(true) {}; return true;', { color: 'purple' }, 1000);
    console.log('Test 5 (infinite loop):', result5);
  } catch (error) {
    console.error('Test 5 failed (expected timeout):', error);
  }

  console.log('Sandbox testing completed');
};

// Export for use in browser console
(globalThis as any).testSandbox = testSandbox;
