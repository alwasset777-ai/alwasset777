import { useState } from 'react';
import { PropertyDetail } from './PropertyDetail';
import { PropertyForm } from './PropertyForm';
import { PropertyList } from './PropertyList';

type View = { mode: 'list' } | { mode: 'detail'; id: string } | { mode: 'form'; id?: string; parentId?: string };

/** Module M1 : liste → fiche → formulaire, avec retour à l'écran précédent. */
export function PropertiesPage({ canWrite }: { canWrite: boolean }) {
  const [stack, setStack] = useState<View[]>([{ mode: 'list' }]);
  const view = stack[stack.length - 1]!;
  const push = (v: View) => setStack((s) => [...s, v]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const top = () => window.scrollTo?.(0, 0);

  if (view.mode === 'detail') {
    return (
      <PropertyDetail
        key={view.id}
        id={view.id}
        canWrite={canWrite}
        onBack={back}
        onEdit={() => push({ mode: 'form', id: view.id })}
        onAddUnit={() => push({ mode: 'form', parentId: view.id })}
        onOpen={(id) => { push({ mode: 'detail', id }); top(); }}
      />
    );
  }
  if (view.mode === 'form') {
    return (
      <PropertyForm
        id={view.id}
        parentId={view.parentId}
        onCancel={back}
        // Après création, la fiche remplace le formulaire dans l'historique.
        onSaved={(id) => setStack((s) => [...s.slice(0, -1).filter((v) => !(v.mode === 'detail' && v.id === id)), { mode: 'detail', id }])}
      />
    );
  }
  return <PropertyList canWrite={canWrite} onOpen={(id) => push({ mode: 'detail', id })} onCreate={() => push({ mode: 'form' })} />;
}
