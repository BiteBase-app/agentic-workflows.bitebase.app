/**
 * Empty placeholder file to avoid TypeScript errors with undici-types
 * This provides type declarations for the problematic undici-types package
 */

declare module 'undici-types' {
  // Empty placeholder to satisfy imports
}

declare module 'undici-types/*' {
  // Handle all subpaths
}

// Handle all potential submodules 
declare module 'undici-types/fetch' {}
declare module 'undici-types/mock-agent' {}
declare module 'undici-types/mock-errors' {}
declare module 'undici-types/global-dispatcher' {}
declare module 'undici-types/api' {}
declare module 'undici-types/formdata' {}
declare module 'undici-types/file' {}
declare module 'undici-types/filereader' {}
declare module 'undici-types/errors' {}
declare module 'undici-types/interceptors' {}
declare module 'undici-types/cache' {}
declare module 'undici-types/fetch-pool' {}
declare module 'undici-types/client' {}
declare module 'undici-types/mock-client' {}
declare module 'undici-types/retry' {} 