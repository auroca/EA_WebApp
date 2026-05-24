// Local declaration to improve compatibility with TypeScript JSX typing
// Fallback declarations for react-icons subpackages used in this project.
import type { IconType } from 'react-icons';

declare module 'react-icons/fa' {
  export const FaApple: IconType;
  export const FaHeart: IconType;
  export const FaRegHeart: IconType;
}

declare module 'react-icons/fc' {
  export const FcGoogle: IconType;
}

// Generic catch-all to avoid other missing-type errors for other subpackages.
declare module 'react-icons/*' {
  const content: Record<string, IconType>;
  export = content;
}
