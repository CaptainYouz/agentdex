<template>
  <div
    v-if="isOpen"
    class="modal-backdrop"
    @click.self="handleBackdropClick"
  >
    <div
      class="modal-dialog"
      role="alertdialog"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <h3
        id="delete-modal-title"
        class="modal-title"
      >
        Delete file?
      </h3>

      <p
        id="delete-modal-description"
        class="modal-description"
      >
        This will permanently delete the file. This action cannot be undone.
      </p>

      <p class="modal-path">
        {{ filePath }}
      </p>

      <div class="modal-actions">
        <button
          class="modal-button cancel-button"
          :disabled="isDeleting"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="modal-button delete-button"
          :disabled="isDeleting"
          type="button"
          @click="emit('confirm')"
        >
          <CodiconIcon
            v-if="isDeleting"
            class="delete-spinner"
            name="loading"
            :size="14"
          />
          {{ isDeleting ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CodiconIcon from '@/components/CodiconIcon.vue'

const props = defineProps<{
  filePath: string
  isDeleting: boolean
  isOpen: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

function handleBackdropClick() {
  if (props.isDeleting) {
    return
  }

  emit('cancel')
}
</script>

<style scoped>
.modal-backdrop {
  align-items: center;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  inset: 0;
  justify-content: center;
  position: fixed;
  z-index: 100;
}

.modal-dialog {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-width: 28rem;
  padding: 1rem;
  width: calc(100% - 2rem);
}

.modal-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}

.modal-description {
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
  margin: 0;
}

.modal-path {
  background: var(--panel-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  line-height: 1.4;
  margin: 0;
  padding: 0.5rem;
  word-break: break-all;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.modal-button {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
}

.modal-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.cancel-button {
  background: var(--panel-muted);
  color: var(--text-muted);
}

.cancel-button:hover:not(:disabled) {
  color: var(--text);
}

.delete-button {
  align-items: center;
  background: #5c2a32;
  border-color: #7a3540;
  color: #ffb4bc;
  display: inline-flex;
  gap: 0.35rem;
}

.delete-button:hover:not(:disabled) {
  background: #6e333c;
}

.delete-spinner {
  animation: delete-spinner-spin 0.8s linear infinite;
}

@keyframes delete-spinner-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
