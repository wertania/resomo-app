# Project

A vue SPA without SSR.

## Testing
Currently no unit tests configured. Vitest is referenced but not implemented.

## State Management
- Pinia stores in `src/stores/`
- Main stores: `authStore`, `user`, `settings`, `toast`

## Composables
Reusable logic is in `src/composables/`.

## API Communication
Always use the Fetcher utility from `src/utils/fetcher.ts`

## Routing
- Vue Router in `src/router/index.ts`
- Views in `src/views/`

## Type Definitions
- Shared types in `src/types/`
- Auto-generated: `auto-imports.d.ts`, `components.d.ts`

## Imports

The most imports in Frontend components are auto-imported in `src/auto-imports.d.ts`. This is done by unplugin-auto-import.

All "vue" imports are auto-imported in `src/auto-imports.d.ts`. This is done by unplugin-auto-import.

All Volt components are auto-imported in `src/components.d.ts`. This is done by unplugin-vue-components.

All components in folder "components" are auto-imported in `src/components.d.ts`. This is done by unplugin-vue-components.

All Icons must be imported explicitly. Example:
import IconFaSolidPlus from '~icons/fa-solid/plus';

## Confirm-Dialog

Important: Never include the <ConfirmDialog> component in the template. This is done in App.vue globally.

Example usage:
```vue
<template>
    <div class="card flex justify-center">
        <Button @click="confirmSave()" label="Save" />
    </div>
 </template>

<script setup lang="ts">
 import { useConfirm } from 'primevue/useconfirm';
 import { useToast } from 'primevue/usetoast';

const confirm = useConfirm();
 const toast = useToast();

const confirmSave = () => {
    confirm.require({
        message: 'Are you sure you want to proceed?',
        header: 'Confirmation',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Confirm'
        },
        accept: () => {
            toast.add({ severity: 'info', summary: 'Confirmed', detail: 'You have accepted', life: 3000 });
        },
        reject: () => {
            toast.add({ severity: 'error', summary: 'Rejected', detail: 'You have rejected', life: 3000 });
        }
    });
 };
 </script>
```

## styling

Tailwind CSS v4 is used. The global styles are in `src/assets/base.css`.
All standard components are styled with PrimeVue's "Volt" theme in the component itself.

## dark mode

Dark mode is supported. The global styles are in `src/assets/base.css`.

## components library

All standard components are used by "Volt" powered by PrimeVue.
Volt is an open source UI component library implemented with the Unstyled PrimeVue components. Volt follows the Code Ownership model.
Look at the [PrimeVue documentation](https://volt.primevue.org/overview) for more information.

Each missing "Volt" component has to be installed by `npx volt-vue add <component-name>`.

All volt components are auto-imported in `src/components.d.ts`. This is done by unplugin-vue-components from /src/volt.

## auto-imports for methods, hooks, etc.

All auto-imports are in `src/auto-imports.d.ts`. This is done by unplugin-auto-import.

## stores

All stores are in `src/stores.d.ts`.

## i18n

I18n is supported. The global locales are in `src/locales/<lang-code>/<component-name>.json`.
The local files are segmented by component.

## icons

Never use PrimeVue icons via CSS or font-awesome icons by CSS!

Icons are used by unplugin-icons.
example: `import IconAccessibility from '~icons/carbon/accessibility`

- [unplugin-icons](https://github.com/unplugin/unplugin-icons)
- [icones.js.org](https://icones.js.org/)
- [icones.js.org/collection/line-md?s=my+search](https://icones.js.org/collection/line-md?s=my+search)
