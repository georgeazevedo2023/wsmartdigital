
## Plan: Add Status Selector to the "+" Menu in the Helpdesk Chat

### Goal
Add a "Status" option inside the `+` (Plus) popover menu in `ChatInput.tsx` that lets agents change the conversation status (Aberta, Pendente, Resolvida) directly from the chat input area, without needing to go to the header selector.

---

### Current State

The `+` menu in `ChatInput.tsx` currently contains:
- Nota privada
- Enviar imagem
- Enviar documento
- Etiquetas (with sub-list)
- Enviar Emojis

The status selector already exists in the `ChatPanel` header (top right), but the user wants it also accessible from the `+` menu for quicker access — especially useful on mobile/tablet where the header might be cramped.

---

### What Will Change

#### 1. `src/components/helpdesk/ChatInput.tsx`

- Add an `onStatusChange` optional prop to `ChatInputProps` (type: `(status: string) => void`)
- Add a `showStatus` state (`boolean`) to control the inline sub-menu expansion, similar to how `showLabels` works for Etiquetas
- Import `CircleDot` (or `Activity`) icon from `lucide-react` for the Status menu item
- Add a "Status" button inside the `+` popover menu that:
  - When clicked, expands a sub-list inline (same UX pattern as Etiquetas)
  - Shows three options: Aberta (green dot), Pendente (yellow dot), Resolvida (gray dot)
  - Highlights the currently active status with a checkmark or highlighted background
  - On option click: calls `supabase.from('conversations').update({ status })` directly (consistent with how labels are handled in `ChatInput`) and calls `onStatusChange?.(status)` to update local UI state

#### 2. `src/components/helpdesk/ChatPanel.tsx`

- Pass `onStatusChange` prop to `<ChatInput>`:
  ```typescript
  onStatusChange={(status) => onUpdateConversation(conversation.id, { status })}
  ```
  This reuses the existing `onUpdateConversation` callback that already handles status changes in the header selector, keeping state in sync.

---

### Technical Details

**Status options and their visual indicators (matching existing header selector):**

| Status | Dot color | Label |
|--------|-----------|-------|
| `aberta` | `bg-emerald-500` | Aberta |
| `pendente` | `bg-yellow-500` | Pendente |
| `resolvida` | `bg-muted-foreground/50` | Resolvida |

**Sub-menu expansion pattern (same as Etiquetas):**
```
[Status button] ← toggles showStatus
  └─ [• Aberta]     ← with active highlight if current status
  └─ [• Pendente]
  └─ [• Resolvida]
```

**Supabase update (directly in ChatInput, no new edge function needed):**
```typescript
await supabase.from('conversations').update({ status: newStatus }).eq('id', conversation.id);
onStatusChange?.(newStatus);
toast.success('Status atualizado');
setMenuOpen(false);
```

---

### Files to Edit

1. **`src/components/helpdesk/ChatInput.tsx`** — Add `onStatusChange` prop, `showStatus` state, and the Status submenu inside the `+` popover
2. **`src/components/helpdesk/ChatPanel.tsx`** — Pass the `onStatusChange` callback to `ChatInput`
