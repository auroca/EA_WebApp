// Local declaration to improve compatibility with TypeScript JSX typing
// Fallback declarations for react-icons subpackages used in this project.
declare module 'react-icons/fa' {
  export const FaApple: any;
  export const FaHeart: any;
  export const FaRegHeart: any;
}

declare module 'react-icons/fc' {
  export const FcGoogle: any;
}

// Generic catch-all to avoid other missing-type errors for other subpackages.
declare module 'react-icons/*' {
  const content: any;
  export = content;
}
