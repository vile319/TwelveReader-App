import 'react';

declare global {
  namespace JSX {
    // Allow all intrinsic element names and attributes to suppress TS errors during rapid prototyping
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}