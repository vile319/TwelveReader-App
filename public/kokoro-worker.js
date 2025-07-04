// Kokoro TTS Web Worker (Scheduling Approach)
// This provides UI responsiveness by managing synthesis timing

let isProcessing = false;

async function processWithYield(text, voice) {
  isProcessing = true;
  
  try {
    // Send request back to main thread for actual synthesis
    // but manage the timing to keep UI responsive
    
    self.postMessage({
      type: 'status',
      message: 'Preparing synthesis...'
    });
    
    // Yield to allow UI updates
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (!isProcessing) return; // Check if cancelled
    
    self.postMessage({
      type: 'startMainThreadSynthesis',
      text: text,
      voice: voice,
      message: 'Starting Kokoro synthesis...'
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    self.postMessage({
      type: 'error',
      message: `Processing failed: ${error.message}`
    });
  }
}

// Handle messages from the main thread
self.onmessage = function(e) {
  const { type, text, voice } = e.data;
  
  switch (type) {
    case 'init':
      // Initialization message from main thread
      self.postMessage({
        type: 'status',
        message: 'Worker initialized and ready'
      });
      break;
      
    case 'synthesize':
      processWithYield(text, voice);
      break;
      
    case 'stop':
      isProcessing = false;
      self.postMessage({
        type: 'stopped',
        message: 'Processing stopped'
      });
      break;
      
    case 'mainThreadComplete':
      // Main thread finished synthesis
      isProcessing = false;
      self.postMessage({
        type: 'processingComplete',
        message: 'Synthesis completed'
      });
      break;
      
    case 'mainThreadError':
      // Main thread encountered error
      isProcessing = false;
      self.postMessage({
        type: 'error',
        message: e.data.message || 'Main thread synthesis failed'
      });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

// Send ready signal
self.postMessage({
  type: 'ready',
  message: 'Kokoro Scheduling Worker initialized'
}); 