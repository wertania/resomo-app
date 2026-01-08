


# Summaries

Never write summaries as markdown. Not needed!



## Frontend

## Imports

The most imports in Frontend components are auto-imported in `src/auto-imports.d.ts`. This is done by unplugin-auto-import.

All "vue" imports are auto-imported in `src/auto-imports.d.ts`. This is done by unplugin-auto-import.
All Volt components are auto-imported in `src/components.d.ts`. This is done by unplugin-vue-components.
All components in folder "components" are auto-imported in `src/components.d.ts`. This is done by unplugin-vue-components.

All Icons must be imported explicitly. Example:
import IconFaSolidPlus from '~icons/fa-solid/plus'

## ConfirmDialog

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
