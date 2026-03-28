<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useRoute } from 'vue-router'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const authStore = useAuthStore()
const theme = useThemeStore()
const route = useRoute()

const showLogoutConfirm = ref(false)
const showStaffLogoutConfirm = ref(false)

defineProps<{
  mobileNavItems?: { to: string; label: string; icon: string }[]
}>()

const emit = defineEmits<{
  'action': []
  'login': []
}>()

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

function confirmLogout() {
  showLogoutConfirm.value = false
  authStore.clearUserId()
  emit('action')
}

function confirmStaffLogout() {
  showStaffLogoutConfirm.value = false
  authStore.logout()
  emit('action')
}
</script>

<template>
  <template v-if="mobileNavItems?.length">
    <router-link v-for="item in mobileNavItems" :key="item.to" :to="item.to"
      class="sidebar__item sidebar__item--mobile-only" :class="{ 'sidebar__item--active': isActive(item.to) }"
      :aria-label="item.label" @click="emit('action')">
      <span class="sidebar__icon">
        <svg v-if="item.icon === 'stats'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
        <svg v-else-if="item.icon === 'feed'" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </span>
      <span class="sidebar__label">{{ item.label }}</span>
      <span class="sidebar__tooltip">{{ item.label }}</span>
    </router-link>
    <div class="sidebar__divider sidebar__item--mobile-only"></div>
  </template>

  <component :is="authStore.isLoggedIn && authStore.userId ? 'router-link' : 'button'"
    :key="authStore.isLoggedIn ? 'profile-link' : 'login-btn'"
    :to="authStore.isLoggedIn && authStore.userId ? { name: 'player-profile', params: { userId: authStore.userId } } : undefined"
    class="sidebar__item sidebar__user-btn" aria-label="User profile"
    @click="!authStore.isLoggedIn ? emit('login') : emit('action')">
    <span class="sidebar__icon">
      <img v-if="authStore.isLoggedIn && authStore.userProfile?.avatarUrl" :src="authStore.userProfile.avatarUrl"
        :alt="authStore.userProfile.name" class="sidebar__user-avatar" />
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
    <span class="sidebar__label">
      {{ authStore.isLoggedIn && authStore.userProfile ? authStore.userProfile.name : 'Log In' }}
    </span>
    <span class="sidebar__tooltip">
      {{ authStore.isLoggedIn && authStore.userProfile ? authStore.userProfile.name : 'Log In' }}
    </span>
  </component>

  <button v-if="authStore.isLoggedIn" class="sidebar__item sidebar__logout-btn" aria-label="Log out"
    @click="showLogoutConfirm = true">
    <span class="sidebar__icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </span>
    <span class="sidebar__label">Log Out</span>
    <span class="sidebar__tooltip">Log Out</span>
  </button>

  <button v-if="authStore.isStaffAuthenticated && authStore.isAdmin" class="sidebar__item sidebar__logout-btn"
    aria-label="Staff log out" @click="showStaffLogoutConfirm = true">
    <span class="sidebar__icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
    <span class="sidebar__label">Staff Logout</span>
    <span class="sidebar__tooltip">Staff Logout</span>
  </button>

  <button class="sidebar__item sidebar__theme-toggle"
    :aria-label="theme.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="theme.toggle(); emit('action')">
    <span class="sidebar__icon">
      <svg v-if="theme.theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </span>
    <span class="sidebar__label">
      {{ theme.theme === 'dark' ? 'Light mode' : 'Dark mode' }}
    </span>
    <span class="sidebar__tooltip">
      {{ theme.theme === 'dark' ? 'Light mode' : 'Dark mode' }}
    </span>
  </button>

  <BaseModal :open="showLogoutConfirm" title="Log Out" max-width="340px" @close="showLogoutConfirm = false">
    <p class="logout-confirm__message">Are you sure you want to log out?</p>
    <template #footer>
      <div class="logout-confirm__actions">
        <BaseButton @click="showLogoutConfirm = false">Cancel</BaseButton>
        <BaseButton variant="destructive" @click="confirmLogout">Log Out</BaseButton>
      </div>
    </template>
  </BaseModal>

  <BaseModal :open="showStaffLogoutConfirm" title="Staff Log Out" max-width="340px"
    @close="showStaffLogoutConfirm = false">
    <p class="logout-confirm__message">Are you sure you want to log out of the staff panel?</p>
    <template #footer>
      <div class="logout-confirm__actions">
        <BaseButton @click="showStaffLogoutConfirm = false">Cancel</BaseButton>
        <BaseButton variant="destructive" @click="confirmStaffLogout">Log Out</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style>
.sidebar__item--mobile-only {
  display: none;
}

.sidebar__divider {
  height: 1px;
  background: var(--bg-overlay);
  margin: var(--space-xs, 4px) var(--space-md, 16px);
}

.logout-confirm__message {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.logout-confirm__actions {
  display: flex;
  gap: var(--space-sm, 8px);
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .sidebar__item--mobile-only {
    display: flex;
  }

  .sidebar__divider.sidebar__item--mobile-only {
    display: block;
  }
}
</style>
