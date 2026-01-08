/// <reference types="vite/client" />

declare module '~icons/mdi/*' {
  import { FunctionalComponent, SVGAttributes } from 'vue'
  const component: FunctionalComponent<SVGAttributes>
  export default component
}

declare module '~icons/fa-solid/*' {
  import { FunctionalComponent, SVGAttributes } from 'vue'
  const component: FunctionalComponent<SVGAttributes>
  export default component
}

// Hanko Elements TypeScript support
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// Hanko custom elements
declare namespace JSX {
  interface IntrinsicElements {
    'hanko-auth': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >
    'hanko-profile': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >
    'hanko-events': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >
  }
}
