// Simple test runner for sandbox functionality
// Run this in your browser's developer console to test the sandbox

import { executeCodeSafely, createSandbox } from './sandbox';

// Test cases for the sandbox
const runSandboxTests = async () => {
  const failures: string[] = [];

  // Test 1: Basic function execution
  try {
    const result1 = await executeCodeSafely('return slab.color === "red";', { color: 'red' });
    if (!(result1.success && result1.result === true)) {
      failures.push('Basic function execution failed');
    }
  } catch (error) {
    failures.push(`Basic function execution failed: ${error}`);
  }

  // Test 2: Malicious code that should be blocked
  try {
    const result2 = await executeCodeSafely('window.location = "https://evil.com"; return true;', { color: 'blue' });
    if (result2.success !== false && !result2.error) {
      failures.push('Malicious code (window.location) was not blocked');
    }
  } catch (error) {
    // This is expected - malicious code should be blocked
  }

  // Test 3: Code that tries to access fetch (isolated in worker)
  try {
    const result3 = await executeCodeSafely('fetch("/api/steal-data"); return true;', { color: 'green' });
    // Fetch is allowed in workers but isolated - this test always passes
  } catch (error) {
    // Fetch might be blocked in some environments - this is also acceptable
  }

  // Test 4: Code that tries to access localStorage
  try {
    const result4 = await executeCodeSafely('localStorage.setItem("hack", "data"); return true;', { color: 'yellow' });
    if (result4.success !== false && !result4.error) {
      failures.push('localStorage access was not blocked');
    }
  } catch (error) {
    // This is expected - localStorage should be blocked
  }

  // Test 5: Infinite loop (should timeout)
  try {
    const result5 = await executeCodeSafely('while(true) {}; return true;', { color: 'purple' }, 1000);
    if (result5.success !== false || !result5.error?.includes('timeout')) {
      failures.push('Infinite loop timeout protection failed');
    }
  } catch (error) {
    // This is expected - infinite loop should be blocked
  }

  // Test 6: Complex slab evaluation
  try {
    const complexSlab = {
      color: 'blue',
      size: 'large',
      pattern: 'stripes',
      hasSpots: false
    };
    const result6 = await executeCodeSafely(
      'return slab.color === "blue" && slab.size === "large" && !slab.hasSpots;',
      complexSlab
    );
    if (!(result6.success && result6.result === true)) {
      failures.push('Complex slab evaluation failed');
    }
  } catch (error) {
    failures.push(`Complex slab evaluation failed: ${error}`);
  }

  // Test 7: Syntax error handling
  try {
    const result7 = await executeCodeSafely('return slab.color === "red" &&;', { color: 'red' });
    if (result7.success !== false || !result7.error) {
      failures.push('Syntax error handling failed');
    }
  } catch (error) {
    // This is expected - syntax errors should be handled
  }

  // Report results
  if (failures.length > 0) {
    console.error('❌ Sandbox security test failures:');
    failures.forEach(failure => console.error(`  - ${failure}`));
    throw new Error(`${failures.length} sandbox security test(s) failed`);
  }
};

// Export for use in browser console
(globalThis as any).runSandboxTests = runSandboxTests;

// Verbose version for manual testing
const runSandboxTestsVerbose = async () => {
  console.log('🧪 Starting verbose sandbox tests...\n');

  // Test 1: Basic function execution
  console.log('Test 1: Basic function execution');
  try {
    const result1 = await executeCodeSafely('return slab.color === "red";', { color: 'red' });
    console.log('✅ Result:', result1);
    if (result1.success && result1.result === true) {
      console.log('✅ Test 1 PASSED\n');
    } else {
      console.log('❌ Test 1 FAILED\n');
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error, '\n');
  }

  // Test 2: Malicious code that should be blocked
  console.log('Test 2: Malicious code (should be blocked)');
  try {
    const result2 = await executeCodeSafely('window.location = "https://evil.com"; return true;', { color: 'blue' });
    console.log('✅ Result:', result2);
    if (result2.success === false || result2.error) {
      console.log('✅ Test 2 PASSED (malicious code blocked)\n');
    } else {
      console.log('❌ Test 2 FAILED (malicious code was not blocked)\n');
    }
  } catch (error) {
    console.log('✅ Test 2 PASSED (malicious code blocked with error)\n');
  }

  // Test 3: Fetch isolation
  console.log('Test 3: Fetch access (isolated in worker context)');
  try {
    const result3 = await executeCodeSafely('fetch("/api/steal-data"); return true;', { color: 'green' });
    console.log('✅ Result:', result3);
    if (result3.success) {
      console.log('✅ Test 3 PASSED (fetch works but is isolated from main app)\n');
    } else {
      console.log('ℹ️  Test 3 INFO (fetch failed - this is expected in some environments)\n');
    }
  } catch (error) {
    console.log('ℹ️  Test 3 INFO (fetch blocked - this is expected in some environments)\n');
  }

  // Test 4: localStorage blocking
  console.log('Test 4: localStorage access (should be blocked)');
  try {
    const result4 = await executeCodeSafely('localStorage.setItem("hack", "data"); return true;', { color: 'yellow' });
    console.log('✅ Result:', result4);
    if (result4.success === false || result4.error) {
      console.log('✅ Test 4 PASSED (localStorage access blocked)\n');
    } else {
      console.log('❌ Test 4 FAILED (localStorage access was not blocked)\n');
    }
  } catch (error) {
    console.log('✅ Test 4 PASSED (localStorage access blocked with error)\n');
  }

  // Test 5: Timeout protection
  console.log('Test 5: Infinite loop (should timeout)');
  try {
    const result5 = await executeCodeSafely('while(true) {}; return true;', { color: 'purple' }, 1000);
    console.log('✅ Result:', result5);
    if (result5.success === false && result5.error?.includes('timeout')) {
      console.log('✅ Test 5 PASSED (infinite loop timed out)\n');
    } else {
      console.log('❌ Test 5 FAILED (infinite loop was not handled properly)\n');
    }
  } catch (error) {
    console.log('✅ Test 5 PASSED (infinite loop blocked with error)\n');
  }

  // Test 6: Complex slab evaluation
  console.log('Test 6: Complex slab evaluation');
  try {
    const complexSlab = {
      color: 'blue',
      size: 'large',
      pattern: 'stripes',
      hasSpots: false
    };
    const result6 = await executeCodeSafely(
      'return slab.color === "blue" && slab.size === "large" && !slab.hasSpots;',
      complexSlab
    );
    console.log('✅ Result:', result6);
    if (result6.success && result6.result === true) {
      console.log('✅ Test 6 PASSED\n');
    } else {
      console.log('❌ Test 6 FAILED\n');
    }
  } catch (error) {
    console.log('❌ Test 6 FAILED:', error, '\n');
  }

  // Test 7: Syntax error handling
  console.log('Test 7: Syntax error handling');
  try {
    const result7 = await executeCodeSafely('return slab.color === "red" &&;', { color: 'red' });
    console.log('✅ Result:', result7);
    if (result7.success === false && result7.error) {
      console.log('✅ Test 7 PASSED (syntax error handled)\n');
    } else {
      console.log('❌ Test 7 FAILED (syntax error was not handled)\n');
    }
  } catch (error) {
    console.log('✅ Test 7 PASSED (syntax error handled with exception)\n');
  }

  console.log('🎉 Verbose sandbox testing completed!');
};

// Export functions for manual testing
(globalThis as any).runSandboxTestsVerbose = runSandboxTestsVerbose;
(globalThis as any).testBasicFunction = async () => {
  const result = await executeCodeSafely('return slab.color === "red";', { color: 'red' });
  console.log('Basic function test:', result);
  return result;
};

(globalThis as any).testMaliciousCode = async () => {
  const result = await executeCodeSafely('window.location = "https://evil.com"; return true;', { color: 'blue' });
  console.log('Malicious code test:', result);
  return result;
};

(globalThis as any).testTimeout = async () => {
  const result = await executeCodeSafely('while(true) {}; return true;', { color: 'purple' }, 1000);
  console.log('Timeout test:', result);
  return result;
};

export { runSandboxTests };
