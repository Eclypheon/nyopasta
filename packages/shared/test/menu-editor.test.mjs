import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { localStore } from '../dist/api/appwrite.js';

// The cloud path is not exercised here; this covers the offline/local fallback the
// admin menu editor writes through when Appwrite is unreachable.
describe('Menu editor: create, archive and restore', () => {
  it('creates a menu item with a generated id', () => {
    const created = localStore.createMenuItem({
      name: 'Test Pasta',
      chineseName: '测试面',
      category: 'mains',
      price: 6.5,
      description: '',
      isSoldOut: false,
    });

    assert.ok(created.id);
    assert.ok(localStore.getMenuItems().some((i) => i.id === created.id && i.name === 'Test Pasta'));
  });

  it('archives an item out of the live list and restores it back', () => {
    const created = localStore.createMenuItem({
      name: 'Archive Me',
      chineseName: '归档',
      category: 'sides',
      subcategory: 'Bread',
      price: 2,
      description: '',
      isSoldOut: false,
    });

    localStore.updateMenuItem({ ...created, isArchived: true });
    assert.equal(localStore.getMenuItems().filter((i) => !i.isArchived).some((i) => i.id === created.id), false);
    assert.equal(localStore.getMenuItems().filter((i) => i.isArchived).some((i) => i.id === created.id), true);

    localStore.updateMenuItem({ ...created, isArchived: false });
    assert.equal(localStore.getMenuItems().filter((i) => !i.isArchived).some((i) => i.id === created.id), true);
  });

  it('keeps edits to name, price and kid portion', () => {
    const created = localStore.createMenuItem({
      name: 'Editable',
      chineseName: '可编辑',
      category: 'soups',
      price: 3,
      description: '',
      isSoldOut: false,
    });

    const updated = localStore.updateMenuItem({
      ...created,
      name: 'Edited Name',
      price: 4.2,
      isKidOption: true,
      kidPrice: 2.1,
    });

    assert.equal(updated.name, 'Edited Name');
    assert.equal(updated.price, 4.2);
    assert.equal(updated.isKidOption, true);
    assert.equal(updated.kidPrice, 2.1);
  });
});
