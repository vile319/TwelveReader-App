// Ensure React JSX runtime types are available even when @types/react isn't picked up automatically
// This makes the IDE and linter happy when using compilerOption "jsx": "react-jsx".

import { ReactElement, JSXElementConstructor, ReactNode, Key } from 'react';

declare module 'react/jsx-runtime' {
  export function jsx(type: JSXElementConstructor<any> | string, props: any, key?: Key): ReactElement;
  export function jsxs(type: JSXElementConstructor<any> | string, props: any, key?: Key): ReactElement;
  export const Fragment: ({ children }: { children?: ReactNode }) => ReactElement;
}