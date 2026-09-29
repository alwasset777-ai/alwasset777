import { useState, type FormEvent } from 'react';
import type { CustomFieldDef, CustomFieldType } from '../../api/contract';
import type { DictKey } from '../../i18n/index';
import { errorMessage, useApi, useAsync, validationFields } from '../api';
import { Alert, Button, Card, Field, Input } from '../components/ui';
import { useI18n } from '../i18n';

const TYPES: CustomFieldType[] = ['text', 'number', 'boolean', 'date', 'select'];
const EMPTY: CustomFieldDef = { entity: 'properties', key: '', labelAr: '', labelFr: '', labelEn: '', fieldType: 'text', options: [] };

/** Gestion des attributs personnalisés des biens (administrateur). */
export function CustomFieldsCard() {
  const api = useApi();
  const { t, lang } = useI18n();
  const { data, reload } = useAsync(() => api.customFields.list('properties'), []);
  const [draft, setDraft] = useState<CustomFieldDef | null>(null);
  const [options, setOptions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  const label = (d: CustomFieldDef) => (lang === 'ar' ? d.labelAr : lang === 'fr' ? d.labelFr : d.labelEn);
  const err = (k: string) => (errors[k] ? t(`err.${errors[k]}` as DictKey) : undefined);

  function edit(d: CustomFieldDef) {
    setDraft(d);
    setOptions(d.options.join(', '));
    setErrors({});
    setError(undefined);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    try {
      await api.customFields.save({ ...draft, options: options.split(/[,،]/).map((o) => o.trim()).filter(Boolean) });
      setDraft(null);
      reload();
    } catch (ex) {
      const f = validationFields(ex);
      if (f) setErrors(f);
      else setError(errorMessage(ex));
    }
  }

  return (
    <Card title={t('cf.title')} actions={!draft && <Button variant="secondary" onClick={() => edit(EMPTY)}>+ {t('cf.add')}</Button>}>
      <p className="mb-3 text-sm text-muted">{t('cf.help')}</p>
      {data && data.length > 0 && (
        <ul className="mb-4 divide-y divide-line text-sm">
          {data.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 py-2">
              <span>{label(d)} <span className="text-xs text-muted">({t(`cftype.${d.fieldType}` as DictKey)})</span></span>
              <span className="flex gap-1">
                <Button variant="ghost" onClick={() => edit(d)}>{t('common.edit')}</Button>
                <Button variant="ghost" onClick={() => confirm(`${t('common.delete')} « ${label(d)} » ?`) && void api.customFields.remove(d.id!).then(reload)}>{t('common.delete')}</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {draft && (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label={t('cf.key')} error={err('key')}>
            <Input dir="ltr" value={draft.key} disabled={!!draft.id} placeholder="piscine" onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase() })} />
          </Field>
          <Field label={t('cf.type')} error={err('fieldType')}>
            <select className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" value={draft.fieldType} onChange={(e) => setDraft({ ...draft, fieldType: e.target.value as CustomFieldType })}>
              {TYPES.map((x) => <option key={x} value={x}>{t(`cftype.${x}` as DictKey)}</option>)}
            </select>
          </Field>
          <Field label={t('cf.labelAr')} error={err('labelAr')}><Input value={draft.labelAr} onChange={(e) => setDraft({ ...draft, labelAr: e.target.value })} /></Field>
          <Field label={t('cf.labelFr')}><Input dir="ltr" value={draft.labelFr} onChange={(e) => setDraft({ ...draft, labelFr: e.target.value })} /></Field>
          <Field label={t('cf.labelEn')}><Input dir="ltr" value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} /></Field>
          {draft.fieldType === 'select' && (
            <Field label={t('cf.options')} error={err('options')}><Input value={options} onChange={(e) => setOptions(e.target.value)} /></Field>
          )}
          {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
