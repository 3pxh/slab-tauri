// Web Worker for safe code execution
// This worker runs in complete isolation from the main thread

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { code, slab, timeout = 5000 } = event.data;
  
  try {
    // Create a timeout to prevent infinite loops
    const timeoutId = setTimeout(() => {
      self.postMessage({
        success: false,
        error: 'Execution timeout exceeded',
        result: null
      });
    }, timeout);

    // Create the evaluation function in the worker's isolated context
    const evalFunction = new Function('slab', code);
    
    // Execute the function
    const result = evalFunction(slab);
    
    // Clear timeout if execution completed
    clearTimeout(timeoutId);
    
    // Send result back to main thread
    self.postMessage({
      success: true,
      error: null,
      result: result
    });
    
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      result: null
    });
  }
});

// Export empty object to make this a valid module
export {};
