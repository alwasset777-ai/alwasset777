/**
 * Boîte de confirmation intégrée à la page. Remplace window.confirm(), qui
 * est désactivé dans certains contextes (pages intégrées, démo web).
 */
export function askConfirm(message: string, labels = { ok: 'تأكيد', cancel: 'إلغاء' }): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4';
    const box = document.createElement('div');
    box.className = 'w-full max-w-sm space-y-4 rounded-xl bg-white p-5 text-ink shadow-xl';
    const text = document.createElement('p');
    text.className = 'text-sm leading-6';
    text.textContent = message;
    const row = document.createElement('div');
    row.className = 'flex justify-end gap-2';
    const mk = (label: string, cls: string, value: boolean) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.className = `rounded-lg px-4 py-2 text-sm font-semibold ${cls}`;
      b.onclick = () => close(value);
      return b;
    };
    const cancel = mk(labels.cancel, 'border border-line bg-white hover:bg-canvas', false);
    const ok = mk(labels.ok, 'bg-brand-600 text-white hover:bg-brand-700', true);
    row.append(cancel, ok);
    box.append(text, row);
    overlay.append(box);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    function close(v: boolean) {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(v);
    }
    overlay.onclick = (e) => e.target === overlay && close(false);
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    ok.focus();
  });
}
