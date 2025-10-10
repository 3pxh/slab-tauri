// Sandbox utilities for safe code execution

export interface SandboxResult {
  success: boolean;
  error: string | null;
  result: any;
}

export class WebWorkerSandbox {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, {
    resolve: (result: SandboxResult) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    // Create a blob URL for the worker script
    const workerScript = `
      // Web Worker for safe code execution
      self.addEventListener('message', (event) => {
        const { messageId, code, slab, timeout = 5000 } = event.data;
        
        try {
          // Create a timeout to prevent infinite loops
          const timeoutId = setTimeout(() => {
            self.postMessage({
              messageId,
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
            messageId,
            success: true,
            error: null,
            result: result
          });
          
        } catch (error) {
          // Send error back to main thread
          self.postMessage({
            messageId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            result: null
          });
        }
      });
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    this.worker = new Worker(workerUrl);
    
    this.worker.addEventListener('message', (event) => {
      const { messageId, success, error, result } = event.data;
      const pending = this.pendingMessages.get(messageId);
      
      if (pending) {
        this.pendingMessages.delete(messageId);
        if (success) {
          pending.resolve({ success: true, error: null, result });
        } else {
          pending.resolve({ success: false, error, result: null });
        }
      }
    });

    this.worker.addEventListener('error', (error) => {
      // Handle worker errors
      console.error('Worker error:', error);
      // Reject all pending messages
      for (const [, pending] of this.pendingMessages) {
        pending.reject(new Error('Worker error occurred'));
      }
      this.pendingMessages.clear();
    });
  }

  async executeCode(code: string, slab: any, timeout: number = 5000): Promise<SandboxResult> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const messageId = ++this.messageId;
    
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(messageId, { resolve, reject });
      
      // Set up a timeout for the entire operation
      const operationTimeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        resolve({
          success: false,
          error: 'Operation timeout exceeded',
          result: null
        });
      }, timeout + 1000); // Add buffer to worker timeout

      // Override resolve to clear timeout
      const originalResolve = resolve;
      resolve = (result) => {
        clearTimeout(operationTimeout);
        originalResolve(result);
      };

      this.worker!.postMessage({
        messageId,
        code,
        slab,
        timeout
      });
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingMessages.clear();
  }
}

// ShadowRealm API implementation (for modern browsers)
export class ShadowRealmSandbox {
  private realm: any;

  constructor() {
    // Check if ShadowRealm is available
    if (typeof (globalThis as any).ShadowRealm === 'undefined') {
      throw new Error('ShadowRealm API not supported in this browser');
    }
    this.realm = new (globalThis as any).ShadowRealm();
  }

  async executeCode(code: string, slab: any): Promise<SandboxResult> {
    try {
      // Create a function in the ShadowRealm that takes slab as parameter
      const functionCode = `(slab) => { ${code} }`;
      const evalFunction = this.realm.evaluate(functionCode);
      
      // Execute the function with the slab data
      const result = evalFunction(slab);
      
      return {
        success: true,
        error: null,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        result: null
      };
    }
  }
}

// Factory function to create the best available sandbox
export function createSandbox(): WebWorkerSandbox | ShadowRealmSandbox {
  // Try ShadowRealm first (more efficient)
  try {
    return new ShadowRealmSandbox();
  } catch {
    // Fall back to Web Worker
    return new WebWorkerSandbox();
  }
}

// Utility function for backward compatibility
export async function executeCodeSafely(
  code: string, 
  slab: any, 
  timeout: number = 5000
): Promise<SandboxResult> {
  const sandbox = createSandbox();
  
  try {
    const result = await sandbox.executeCode(code, slab, timeout);
    return result;
  } finally {
    // Clean up if it's a WebWorkerSandbox
    if (sandbox instanceof WebWorkerSandbox) {
      sandbox.destroy();
    }
  }
}
