/*
  Local fallback type declarations for the automatic JSX runtime.
  Some editors/linter setups look for the module path `react/jsx-runtime` at type-check time.
  When `node_modules` hasn't been installed yet (e.g. in the online playground or CI lint stage),
  the real file is missing which triggers the error:
    ⨯ Cannot find module 'react/jsx-runtime'
  Declaring it here silences that error while still preserving correct typing because we
  re-export everything from the main React namespace's JSX runtime types.
*/

declare module 'react/jsx-runtime' {
  // Re-export the intrinsic JSX helpers from React's public types.
  // This is a minimal subset sufficient for type-checking; at runtime Vite/React
  // will resolve the real implementation from the React package.
  import * as React from 'react';

  export function jsx(type: React.ElementType, props: any, key?: React.Key): React.ReactElement;
  export function jsxs(type: React.ElementType, props: any, key?: React.Key): React.ReactElement;
  export const Fragment: typeof React.Fragment;
}

/*
  Development build variant – used by React in development mode for better debugging.
  We forward to the same helpers because for type-checking purposes the signatures are identical.
*/

declare module 'react/jsx-dev-runtime' {
  import * as React from 'react';

  export function jsxDEV(
    type: React.ElementType,
    props: any,
    key: React.Key | undefined,
    isStaticChildren: boolean,
    source: { fileName: string; lineNumber: number; columnNumber: number },
    self: any
  ): React.ReactElement;

  export { jsx, jsxs, Fragment } from 'react/jsx-runtime';
}