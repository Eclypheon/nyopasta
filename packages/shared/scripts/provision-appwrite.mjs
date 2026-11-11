#!/usr/bin/env node

import { Client, Databases, Storage, Teams, Permission, Role } from 'node-appwrite';
import { INITIAL_MENU_ITEMS, DEFAULT_STORE_SETTINGS } from '../dist/constants/index.js';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!PROJECT_ID || !API_KEY) {
  console.error('\nUsage error: Missing Appwrite Cloud credentials.');
  console.error('Please provide APPWRITE_PROJECT_ID and APPWRITE_API_KEY environment variables.');
  console.error('Example:');
  console.error('  APPWRITE_PROJECT_ID=your_project_id APPWRITE_API_KEY=your_secret_api_key node provision-appwrite.mjs\n');
  process.exit(1);
}

console.log(`Connecting to Appwrite Cloud at ${ENDPOINT}...`);
console.log(`Project ID: ${PROJECT_ID}`);
console.log(`API Key: ${API_KEY.substring(0, 8)}... (length ${API_KEY.length})`);

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const teams = new Teams(client);

const DB_ID = 'nyopasta_db';
const BUCKET_ID = 'menu_assets';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n--- Step 1: Admin Team Setup ---');
  try {
    await teams.get('admin');
    console.log('Team "admin" already exists.');
  } catch (err) {
    if (err.code === 404) {
      console.log('Creating team "admin"...');
      await teams.create('admin', 'NYO Admin Staff');
      console.log('Created team "admin".');
    } else {
      console.warn('Team check warning:', err.message);
    }
  }

  console.log('\n--- Step 2: Database Setup ---');
  try {
    await databases.get(DB_ID);
    console.log(`Database "${DB_ID}" already exists.`);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Creating database "${DB_ID}"...`);
      await databases.create(DB_ID, 'NYO Pasta DB');
      console.log(`Database "${DB_ID}" created.`);
    } else {
      throw err;
    }
  }

  console.log('\n--- Step 3: Storage Bucket Setup ---');
  try {
    await storage.getBucket(BUCKET_ID);
    console.log(`Storage bucket "${BUCKET_ID}" already exists.`);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Creating storage bucket "${BUCKET_ID}"...`);
      await storage.createBucket(
        BUCKET_ID,
        'Menu Assets',
        [Permission.read(Role.any()), Permission.create(Role.team('admin')), Permission.update(Role.team('admin')), Permission.delete(Role.team('admin'))],
        false,
        true,
        undefined,
        ['jpg', 'jpeg', 'png', 'webp', 'svg'],
        'none',
        false,
        false
      );
      console.log(`Storage bucket "${BUCKET_ID}" created.`);
    } else {
      console.warn('Storage bucket warning:', err.message);
    }
  }

  console.log('\n--- Step 4: Collection Schemas ---');

  // 4.1 menu_items collection
  await ensureCollection('menu_items', 'Menu Items', [
    Permission.read(Role.any()),
    Permission.create(Role.team('admin')),
    Permission.update(Role.team('admin')),
    Permission.delete(Role.team('admin')),
  ]);

  await ensureStringAttribute('menu_items', 'name', 128, true);
  await ensureStringAttribute('menu_items', 'chineseName', 128, true);
  await ensureStringAttribute('menu_items', 'category', 32, true);
  await ensureStringAttribute('menu_items', 'subcategory', 64, false);
  await ensureFloatAttribute('menu_items', 'price', true);
  await ensureBooleanAttribute('menu_items', 'isKidOption', false, false);
  await ensureFloatAttribute('menu_items', 'kidPrice', false);
  await ensureStringAttribute('menu_items', 'description', 1000, false);
  await ensureStringAttribute('menu_items', 'chineseDescription', 1000, false);
  await ensureStringAttribute('menu_items', 'tag', 32, false);
  await ensureBooleanAttribute('menu_items', 'isSoldOut', false, false);
  await ensureStringAttribute('menu_items', 'imageUrl', 512, false);

  // 4.2 orders collection
  await ensureCollection('orders', 'Orders', [
    Permission.read(Role.any()),
    Permission.create(Role.any()),
    Permission.update(Role.team('admin')),
    Permission.delete(Role.team('admin')),
  ]);

  await ensureStringAttribute('orders', 'orderNumber', 32, true);
  await ensureStringAttribute('orders', 'customerId', 64, false);
  await ensureStringAttribute('orders', 'customerName', 128, true);
  await ensureStringAttribute('orders', 'customerContact', 64, true);
  await ensureBooleanAttribute('orders', 'isGuest', false, true);
  await ensureStringAttribute('orders', 'itemsJson', 10000, true);
  await ensureStringAttribute('orders', 'fulfillmentType', 32, true);
  await ensureFloatAttribute('orders', 'takeawayFee', false, 0);
  await ensureFloatAttribute('orders', 'subtotal', true);
  await ensureFloatAttribute('orders', 'discountAmount', false, 0);
  await ensureStringAttribute('orders', 'discountDescription', 256, false);
  await ensureFloatAttribute('orders', 'total', true);
  await ensureStringAttribute('orders', 'paymentMethod', 32, true);
  await ensureStringAttribute('orders', 'paymentStatus', 32, true);
  await ensureStringAttribute('orders', 'fulfillmentStatus', 32, true);
  await ensureIntegerAttribute('orders', 'mainsCount', false, 0);
  await ensureIntegerAttribute('orders', 'stampsEarned', false, 0);
  await ensureIntegerAttribute('orders', 'redeemedMilestone', false);

  // 4.3 profiles collection
  await ensureCollection('profiles', 'Profiles', [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.update(Role.team('admin')),
    Permission.delete(Role.team('admin')),
  ]);

  await ensureStringAttribute('profiles', 'userId', 64, true);
  await ensureStringAttribute('profiles', 'name', 128, true);
  await ensureStringAttribute('profiles', 'email', 128, false);
  await ensureStringAttribute('profiles', 'phone', 32, false);
  await ensureStringAttribute('profiles', 'role', 32, false, 'customer');
  await ensureIntegerAttribute('profiles', 'currentStampCount', false, 0);
  await ensureIntegerAttribute('profiles', 'completedCardsCount', false, 0);
  await ensureStringAttribute('profiles', 'milestonesRedeemedJson', 512, false, '{"stamp4":false,"stamp8":false,"stamp12":false}');
  await ensureStringAttribute('profiles', 'stampHistoryJson', 10000, false, '[]');
  await ensureStringAttribute('profiles', 'lastOrderId', 64, false);
  await ensureStringAttribute('profiles', 'lastOrderSummary', 512, false);
  await ensureStringAttribute('profiles', 'lastOrderDate', 64, false);
  await ensureIntegerAttribute('profiles', 'totalOrdersCount', false, 0);
  await ensureIntegerAttribute('profiles', 'voucherSide350Count', false, 0);
  await ensureIntegerAttribute('profiles', 'voucherSide450Count', false, 0);
  await ensureIntegerAttribute('profiles', 'voucherMeal850Count', false, 0);
  await ensureBooleanAttribute('profiles', 'isBlacklisted', false, false);
  await ensureStringAttribute('profiles', 'blacklistReason', 512, false);

  // 4.4 store_settings collection
  await ensureCollection('store_settings', 'Store Settings', [
    Permission.read(Role.any()),
    Permission.update(Role.team('admin')),
  ]);

  await ensureBooleanAttribute('store_settings', 'isManuallyClosed', false, false);
  await ensureStringAttribute('store_settings', 'manualCloseReason', 256, false);
  await ensureStringAttribute('store_settings', 'bannerMessage', 256, false);
  await ensureStringAttribute('store_settings', 'scheduleJson', 5000, true);
  await ensureStringAttribute('store_settings', 'payNowType', 16, false, 'mobile');
  await ensureStringAttribute('store_settings', 'payNowUen', 64, false, '202300000A');
  await ensureStringAttribute('store_settings', 'payNowRecipientName', 128, false, 'NYO PASTA');
  await ensureStringAttribute('store_settings', 'payNowMobile', 32, false);
  await ensureStringAttribute('store_settings', 'payNowQrUrl', 512, false);
  await ensureFloatAttribute('store_settings', 'takeawayFeePerItem', false, 0.3);

  console.log('\n--- Step 5: Initial Data Seeding ---');
  await seedInitialData();

  console.log('\nAppwrite Cloud schema provisioning completed successfully!');
}

async function ensureCollection(id, name, permissions) {
  try {
    await databases.getCollection(DB_ID, id);
    console.log(`Collection "${id}" exists.`);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Creating collection "${id}" (${name})...`);
      await databases.createCollection(DB_ID, id, name, permissions);
      console.log(`Collection "${id}" created.`);
    } else if (err.message && (err.message.includes('collections.read') || err.message.includes('collections.write'))) {
      console.error('\n⚠️ API Key Missing Granular Database Scopes:');
      console.error('Your API key has database permissions, but is missing collection permissions.');
      console.error('In Appwrite Console > Project Settings > API Keys > edit your key:');
      console.error('Under "Database", make sure these individual sub-scopes are checked:');
      console.error('  ✓ Collections (collections.read, collections.write)');
      console.error('  ✓ Attributes  (attributes.read, attributes.write)');
      console.error('  ✓ Documents   (documents.read, documents.write)');
      console.error('  ✓ Indexes     (indexes.read, indexes.write)');
      console.error('Then click "Update" at the bottom of the modal to save.');
      throw err;
    } else {
      throw err;
    }
  }
}

async function ensureStringAttribute(collectionId, key, size, required, defaultValue = undefined) {
  const isRequired = defaultValue !== undefined ? false : required;
  try {
    await databases.getAttribute(DB_ID, collectionId, key);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Adding string attribute "${key}" to "${collectionId}"...`);
      await databases.createStringAttribute(DB_ID, collectionId, key, size, isRequired, defaultValue);
      await sleep(300);
    }
  }
}

async function ensureIntegerAttribute(collectionId, key, required, defaultValue = undefined) {
  const isRequired = defaultValue !== undefined ? false : required;
  try {
    await databases.getAttribute(DB_ID, collectionId, key);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Adding integer attribute "${key}" to "${collectionId}"...`);
      await databases.createIntegerAttribute(DB_ID, collectionId, key, isRequired, undefined, undefined, defaultValue);
      await sleep(300);
    }
  }
}

async function ensureFloatAttribute(collectionId, key, required, defaultValue = undefined) {
  const isRequired = defaultValue !== undefined ? false : required;
  try {
    await databases.getAttribute(DB_ID, collectionId, key);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Adding float attribute "${key}" to "${collectionId}"...`);
      await databases.createFloatAttribute(DB_ID, collectionId, key, isRequired, undefined, undefined, defaultValue);
      await sleep(300);
    }
  }
}

async function ensureBooleanAttribute(collectionId, key, required, defaultValue = undefined) {
  const isRequired = defaultValue !== undefined ? false : required;
  try {
    await databases.getAttribute(DB_ID, collectionId, key);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Adding boolean attribute "${key}" to "${collectionId}"...`);
      await databases.createBooleanAttribute(DB_ID, collectionId, key, isRequired, defaultValue);
      await sleep(300);
    }
  }
}

async function waitForAttributesReady(collectionId, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { attributes } = await databases.listAttributes(DB_ID, collectionId);
      const pending = attributes.filter((a) => a.status === 'processing');
      if (pending.length === 0) {
        return;
      }
      console.log(`Waiting for ${pending.length} attribute(s) in "${collectionId}" to become available...`);
    } catch {
      // Continue retrying
    }
    await sleep(1000);
  }
}

async function seedInitialData() {
  await waitForAttributesReady('menu_items');
  await waitForAttributesReady('store_settings');

  // Seed menu items
  for (const item of INITIAL_MENU_ITEMS) {
    try {
      await databases.getDocument(DB_ID, 'menu_items', item.id);
    } catch (err) {
      if (err.code === 404) {
        console.log(`Seeding menu item: ${item.name} (${item.chineseName})...`);
        await databases.createDocument(DB_ID, 'menu_items', item.id, {
          name: item.name,
          chineseName: item.chineseName,
          category: item.category,
          subcategory: item.subcategory || null,
          price: item.price,
          isKidOption: Boolean(item.isKidOption),
          kidPrice: item.kidPrice || null,
          description: item.description || '',
          chineseDescription: item.chineseDescription || '',
          tag: item.tag || null,
          isSoldOut: false,
          imageUrl: item.imageUrl || null,
        });
        await sleep(150);
      }
    }
  }

  // Seed default store settings
  try {
    await databases.getDocument(DB_ID, 'store_settings', 'current_store_settings');
  } catch (err) {
    if (err.code === 404) {
      console.log('Seeding store settings document...');
      await databases.createDocument(DB_ID, 'store_settings', 'current_store_settings', {
        isManuallyClosed: DEFAULT_STORE_SETTINGS.isManuallyClosed,
        manualCloseReason: DEFAULT_STORE_SETTINGS.manualCloseReason || '',
        bannerMessage: DEFAULT_STORE_SETTINGS.bannerMessage || '',
        scheduleJson: JSON.stringify(DEFAULT_STORE_SETTINGS.schedule),
        payNowUen: DEFAULT_STORE_SETTINGS.payNowUen,
        payNowRecipientName: DEFAULT_STORE_SETTINGS.payNowRecipientName,
        payNowMobile: DEFAULT_STORE_SETTINGS.payNowMobile || '',
        payNowQrUrl: DEFAULT_STORE_SETTINGS.payNowQrUrl || '',
        takeawayFeePerItem: DEFAULT_STORE_SETTINGS.takeawayFeePerItem,
      });
    }
  }
}

run().catch((err) => {
  console.error('\nProvisioning failed:', err.message || err);
  if (err.message && err.message.toLowerCase().includes('region')) {
    console.error('\n--- 💡 Region Endpoint Guidance ---');
    console.error('Your Appwrite Cloud project is in a specific geographic region.');
    console.error('Please pass the matching APPWRITE_ENDPOINT for your project:');
    console.error('  - Singapore (SGP): APPWRITE_ENDPOINT="https://sgp.cloud.appwrite.io/v1"');
    console.error('  - Frankfurt (FRA): APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"');
    console.error('  - US East (NYC):   APPWRITE_ENDPOINT="https://nyc.cloud.appwrite.io/v1"');
    console.error('\nYou can verify your exact API Endpoint in the Appwrite Cloud console under:');
    console.error('  Project Settings -> Overview -> API Endpoint');
    console.error('\nExample:');
    console.error('  APPWRITE_ENDPOINT="https://sgp.cloud.appwrite.io/v1" APPWRITE_PROJECT_ID="..." APPWRITE_API_KEY="..." npm run provision:backend\n');
  }
  process.exit(1);
});
