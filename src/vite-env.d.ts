/// <reference types="vite/client" />

/**
 * Type declarations for CSS modules
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

