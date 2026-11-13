import React, { useState, useMemo } from 'react';
import { MenuItem, MenuItemCategory, api } from '@nyopasta/shared';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Save,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface MenuEditorTabProps {
  menuItems: MenuItem[];
  onMenuUpdated: () => void | Promise<void>;
  onBack: () => void;
}

// The customer site renders these exact groups, so new values would be invisible there
const CATEGORIES: { id: MenuItemCategory; label: string }[] = [
  { id: 'mains', label: 'Mains' },
  { id: 'soups', label: 'Soups' },
  { id: 'sides', label: 'Sides' },
];

const SIDE_SUBCATEGORIES = ['Korean Fried Chicken', 'Bread', 'Fried Items'];

const BLANK_ITEM: MenuItem = {
  id: '',
  name: '',
  chineseName: '',
  category: 'mains',
  subcategory: '',
  price: 0,
  isKidOption: false,
  kidPrice: 0,
  description: '',
  chineseDescription: '',
  tag: '',
  isSoldOut: false,
  isArchived: false,
  imageUrl: '',
};

type Draft = { isNew: boolean; item: MenuItem };

export const MenuEditorTab: React.FC<MenuEditorTabProps> = ({
  menuItems,
  onMenuUpdated,
  onBack,
}) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const liveItems = useMemo(() => menuItems.filter((i) => !i.isArchived), [menuItems]);
  const archivedItems = useMemo(() => menuItems.filter((i) => i.isArchived), [menuItems]);

  const setField = <K extends keyof MenuItem>(key: K, value: MenuItem[K]) => {
    setDraft((d) => (d ? { ...d, item: { ...d.item, [key]: value } } : d));
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onMenuUpdated();
      setDraft(null);
    } catch (err: any) {
      setError(
        `${err?.message || 'Save failed.'} If this is the first time you are archiving, run npm run provision:backend once to add the isArchived field.`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    if (!draft) return;
    const { item } = draft;
    if (!item.name.trim() || !item.chineseName.trim()) {
      setError('Name and Chinese name are required.');
      return;
    }
    if (!(item.price >= 0)) {
      setError('Price must be a number of zero or more.');
      return;
    }
    const payload: MenuItem = {
      ...item,
      subcategory: item.category === 'sides' ? item.subcategory || '' : '',
      kidPrice: item.isKidOption ? item.kidPrice || 0 : undefined,
      tag: item.tag?.trim() || undefined,
      imageUrl: item.imageUrl?.trim() || undefined,
      description: item.description || '',
      chineseDescription: item.chineseDescription || '',
    };
    if (draft.isNew) {
      const { id: _id, ...rest } = payload;
      void run(() => api.createMenuItem(rest));
    } else {
      void run(() => api.updateMenuItem(payload));
    }
  };

  const handleArchive = (item: MenuItem) => {
    if (!window.confirm(`Archive "${item.name}"? Customers will no longer see it, and you can bring it back later.`)) {
      return;
    }
    void run(() => api.updateMenuItem({ ...item, isArchived: true }));
  };

  const handleRestore = (item: MenuItem) => {
    void run(() => api.updateMenuItem({ ...item, isArchived: false }));
  };

  const renderRow = (item: MenuItem) => (
    <div key={item.id} className="border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-gray-900 truncate">{item.name}</span>
            <span className="text-[11px] text-gray-500 truncate">{item.chineseName}</span>
            <span className="text-[11px] font-bold text-gray-800">${item.price.toFixed(2)}</span>
            {item.isKidOption && (
              <span className="text-[10px] text-navy bg-navy/10 px-1 rounded">
                Kid ${(item.kidPrice || 0).toFixed(2)}
              </span>
            )}
            {item.subcategory && (
              <span className="text-[10px] text-gray-600 bg-gray-100 px-1 rounded">
                {item.subcategory}
              </span>
            )}
            {item.tag && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1 rounded">
                {item.tag}
              </span>
            )}
            {item.isSoldOut && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1 rounded">
                Sold out
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDraft({ isNew: false, item: { ...item } })}
          className="p-1.5 rounded-lg text-navy hover:bg-navy/10 disabled:opacity-40"
          title="Edit"
          aria-label={`Edit ${item.name}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleArchive(item)}
          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
          title="Archive"
          aria-label={`Archive ${item.name}`}
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>

      {draft && !draft.isNew && draft.item.id === item.id && (
        <div className="px-3 pb-3">{renderForm()}</div>
      )}
    </div>
  );

  const renderForm = () => {
    if (!draft) return null;
    const { item } = draft;
    const inputClass =
      'w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:border-terracotta';
    const labelClass = 'block text-[10px] font-bold text-gray-500 uppercase mb-0.5';

    return (
      <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-2.5 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={item.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Prawn Cream Pasta"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Chinese name</label>
            <input
              className={inputClass}
              value={item.chineseName}
              onChange={(e) => setField('chineseName', e.target.value)}
              placeholder="奶油虾面"
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              className={inputClass}
              value={item.category}
              onChange={(e) => setField('category', e.target.value as MenuItemCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Price ($)</label>
            <input
              type="number"
              step="0.10"
              min="0"
              className={inputClass}
              value={item.price}
              onChange={(e) => setField('price', parseFloat(e.target.value) || 0)}
            />
          </div>
          {item.category === 'sides' && (
            <div>
              <label className={labelClass}>Group</label>
              <select
                className={inputClass}
                value={item.subcategory || ''}
                onChange={(e) => setField('subcategory', e.target.value)}
              >
                <option value="">None</option>
                {SIDE_SUBCATEGORIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Tag (optional)</label>
            <input
              className={inputClass}
              value={item.tag || ''}
              onChange={(e) => setField('tag', e.target.value)}
              placeholder="Signature"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(item.isKidOption)}
              onChange={(e) => setField('isKidOption', e.target.checked)}
            />
            Kid portion
          </label>
          {item.isKidOption && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-500">Kid price $</span>
              <input
                type="number"
                step="0.10"
                min="0"
                className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-terracotta"
                value={item.kidPrice || 0}
                onChange={(e) => setField('kidPrice', parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={2}
            className={inputClass}
            value={item.description || ''}
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Chinese description</label>
          <textarea
            rows={2}
            className={inputClass}
            value={item.chineseDescription || ''}
            onChange={(e) => setField('chineseDescription', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Image path (optional)</label>
          <input
            className={inputClass}
            value={item.imageUrl || ''}
            onChange={(e) => setField('imageUrl', e.target.value)}
            placeholder="dishes/main-1.jpg"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft(null);
              setError(null);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 flex items-center gap-1 disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-terracotta hover:bg-terracotta-600 flex items-center gap-1 disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {busy ? 'Saving...' : draft.isNew ? 'Add item' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  const groups = CATEGORIES.map((cat) => ({
    ...cat,
    items: liveItems.filter((i) => i.category === cat.id),
  }));

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-navy hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          disabled={busy || Boolean(draft?.isNew)}
          onClick={() => {
            setError(null);
            setDraft({ isNew: true, item: { ...BLANK_ITEM } });
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy/90 flex items-center gap-1 disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          Add item
        </button>
      </div>

      <div>
        <h2 className="font-bold text-gray-900 text-base">Change menu</h2>
        <p className="text-xs text-gray-500">
          {liveItems.length} live items, {archivedItems.length} archived. Edits go live on the customer app immediately.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-start gap-1.5 text-red-800 text-[11px] font-bold">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draft?.isNew && <div>{renderForm()}</div>}

      {groups.map((group) => (
        <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
              {group.label}
            </span>
            <span className="text-[10px] text-gray-400">{group.items.length}</span>
          </div>
          {group.items.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-gray-400">No items.</p>
          ) : (
            group.items.map(renderRow)
          )}
        </div>
      ))}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
        >
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {showArchived ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Archived ({archivedItems.length})
          </span>
        </button>
        {showArchived &&
          (archivedItems.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-gray-400">
              Nothing archived. Archived dishes stay here until you bring them back.
            </p>
          ) : (
            archivedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-gray-700 truncate">{item.name}</span>
                  <span className="text-[11px] text-gray-400 ml-1.5">{item.chineseName}</span>
                  <span className="text-[11px] text-gray-500 ml-1.5">
                    [{CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                    {item.subcategory ? ` · ${item.subcategory}` : ''}]
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleRestore(item)}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 disabled:opacity-40"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  Bring back
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDraft({ isNew: false, item: { ...item } })}
                  className="p-1.5 rounded-lg text-navy hover:bg-navy/10 disabled:opacity-40"
                  title="Edit before restoring"
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ))}
      </div>
    </div>
  );
};
