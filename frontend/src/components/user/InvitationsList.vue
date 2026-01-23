<template>
  <div class="grid gap-4 md:grid-cols-1">
    <div
      v-for="invitation in state.tenantInvitations"
      :key="invitation.id"
      class="rounded-lg p-4 shadow-md dark:bg-surface-900"
    >
      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h3 class="text-lg font-semibold text-color">
            {{ invitation.tenantName }}
          </h3>
          <p class="text-sm dark:text-surface-50">
            {{ $t('UserTenants.invitations.role') }}:
            {{ $t(`UserTenants.roles.${invitation.role}`) }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            :label="$t('UserTenants.invitations.accept')"
            text
            @click="acceptInvitation(invitation.tenantId, invitation.id)"
            :loading="state.loading"
          >
            <template #icon>
              <IconFaSolidCheck />
            </template>
          </Button>
          <Button
            :label="$t('UserTenants.invitations.decline')"
            text
            @click="declineInvitation(invitation.tenantId, invitation.id)"
            :loading="state.loading"
          >
            <template #icon>
              <IconFaSolidTimes />
            </template>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconFaSolidCheck from '~icons/line-md/confirm'
import IconFaSolidTimes from '~icons/line-md/close'

const { state, acceptInvitation, declineInvitation } = useUser()
</script>
