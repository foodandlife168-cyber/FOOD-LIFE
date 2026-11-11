import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type { Product, Order, DeliveryAgent, CloudProductImage, StarPointsTransaction, AnnualRewardRecord, AnnualRewardsAnnouncement } from '../types/index.ts';

let firestore: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (firestore) return firestore;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const app = !getApps().length ? initializeApp(config) : getApp();
      firestore = getFirestore(app, config.firestoreDatabaseId);
      console.log('[Firestore] Connected to persistent Firestore database:', config.firestoreDatabaseId);
    }
  } catch (err) {
    console.error('[Firestore] Failed to initialize Firestore:', err);
  }
  return firestore;
}

export async function syncAndMigrateProducts(localProducts: Product[]): Promise<Product[]> {
  const db = getFirestoreDb();
  if (!db) return localProducts;

  try {
    const colRef = collection(db, 'products');
    const snap = await getDocs(colRef);

    if (!snap.empty) {
      const remoteMap = new Map<string, Product>();
      snap.forEach((d) => {
        const item = d.data() as Product;
        if (item && item.nameEn) {
          remoteMap.set(d.id, {
            ...item,
            id: d.id,
            sellingPrice: Number(item.sellingPrice) || 0,
            availableStock: Number(item.availableStock) || 0,
            discountPercent: Number(item.discountPercent) || 0,
            isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
          });
        }
      });

      // Synchronize any new local catalog products that do not exist yet in Firestore
      for (const localProd of localProducts) {
        if (!remoteMap.has(localProd.id)) {
          try {
            await setDoc(doc(db, 'products', localProd.id), sanitizeForFirestore({
              ...localProd,
              sellingPrice: Number(localProd.sellingPrice) || 0,
              availableStock: Number(localProd.availableStock) || 0,
              discountPercent: Number(localProd.discountPercent) || 0,
              isActive: Boolean(localProd.isActive),
              updatedAt: new Date().toISOString(),
            }));
            remoteMap.set(localProd.id, localProd);
            console.log(`[Firestore] Provisioned new catalog product ${localProd.id}: ${localProd.nameEn}`);
          } catch (pErr) {
            console.warn(`[Firestore] Could not write new product ${localProd.id}:`, pErr);
          }
        }
      }

      const mergedList = Array.from(remoteMap.values());
      console.log(`[Firestore] Successfully synchronized ${mergedList.length} products with central Firestore.`);
      return mergedList;
    } else {
      console.log(`[Firestore] Central database is empty. Migrating ${localProducts.length} local products...`);
      for (const prod of localProducts) {
        await setDoc(doc(db, 'products', prod.id), {
          ...prod,
          sellingPrice: Number(prod.sellingPrice) || 0,
          availableStock: Number(prod.availableStock) || 0,
          discountPercent: Number(prod.discountPercent) || 0,
          isActive: Boolean(prod.isActive),
          updatedAt: new Date().toISOString(),
        });
      }
      console.log('[Firestore] Product migration complete.');
      return localProducts;
    }
  } catch (err) {
    console.error('[Firestore] Error in syncAndMigrateProducts:', err);
    return localProducts;
  }
}

export async function syncAndMigrateOrders(localOrders: Order[]): Promise<Order[]> {
  const db = getFirestoreDb();
  if (!db) return localOrders;

  try {
    const colRef = collection(db, 'orders');
    const snap = await getDocs(colRef);

    if (!snap.empty) {
      const orderMap = new Map<string, Order>();
      snap.forEach((d) => {
        const order = d.data() as Order;
        if (order && order.orderNumber) {
          const key = order.orderNumber;
          const existing = orderMap.get(key);
          const currentCreatedAt = new Date(order.createdAt || 0).getTime();
          const existingCreatedAt = existing ? new Date(existing.createdAt || 0).getTime() : 0;
          if (!existing || currentCreatedAt >= existingCreatedAt) {
            orderMap.set(key, {
              ...order,
              id: d.id,
            });
          }
        }
      });
      const remoteOrders = Array.from(orderMap.values());
      remoteOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log(`[Firestore] Successfully synchronized ${remoteOrders.length} unique orders from central Firestore.`);
      return remoteOrders;
    } else if (localOrders.length > 0) {
      console.log(`[Firestore] Migrating ${localOrders.length} local orders to central Firestore...`);
      for (const order of localOrders) {
        await setDoc(doc(db, 'orders', order.id), order);
      }
      console.log('[Firestore] Orders migration complete.');
      return localOrders;
    }
  } catch (err) {
    console.error('[Firestore] Error in syncAndMigrateOrders:', err);
  }
  return localOrders;
}

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else if (Array.isArray(val)) {
        result[key] = val.map((v) => (v && typeof v === 'object' ? sanitizeForFirestore(v) : v));
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const cleanData = sanitizeForFirestore({
    ...product,
    sellingPrice: Number(product.sellingPrice) || 0,
    availableStock: Number(product.availableStock) || 0,
    discountPercent: Number(product.discountPercent) || 0,
    isActive: Boolean(product.isActive),
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, 'products', product.id), cleanData);
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await deleteDoc(doc(db, 'products', productId));
}

export async function saveOrderToFirestore(order: Order): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const cleanOrder = sanitizeForFirestore(order);
  await setDoc(doc(db, 'orders', order.id), cleanOrder);
}

export async function updateOrderStatusInFirestore(orderId: string, status: string, statusHistory: any[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    statusHistory,
    updatedAt: new Date().toISOString(),
  });
}

export async function deductProductStockInFirestore(items: { productId: string; quantity: number }[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  for (const item of items) {
    try {
      const pRef = doc(db, 'products', item.productId);
      const snap = await getDoc(pRef);
      if (snap.exists()) {
        const currentStock = Number(snap.data().availableStock) || 0;
        await updateDoc(pRef, {
          availableStock: Math.max(0, currentStock - item.quantity),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('[Firestore] Error deducting stock for', item.productId, e);
    }
  }
}

export async function restoreProductStockInFirestore(items: { productId: string; quantity: number }[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  for (const item of items) {
    try {
      const pRef = doc(db, 'products', item.productId);
      const snap = await getDoc(pRef);
      if (snap.exists()) {
        const currentStock = Number(snap.data().availableStock) || 0;
        await updateDoc(pRef, {
          availableStock: currentStock + item.quantity,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('[Firestore] Error restoring stock for', item.productId, e);
    }
  }
}

export async function saveStockMovementToFirestore(movement: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const clean = sanitizeForFirestore(movement);
  await setDoc(doc(db, 'stockMovements', movement.id), clean);
}

export async function syncAndMigrateStockMovements(localMovements: any[]): Promise<any[]> {
  const db = getFirestoreDb();
  if (!db) return localMovements;
  try {
    const colRef = collection(db, 'stockMovements');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remote: any[] = [];
      snap.forEach((d) => remote.push(d.data()));
      remote.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return remote;
    } else if (localMovements.length > 0) {
      for (const m of localMovements) {
        await setDoc(doc(db, 'stockMovements', m.id), sanitizeForFirestore(m));
      }
    }
  } catch (err) {
    console.warn('[Firestore] Error syncing stockMovements:', err);
  }
  return localMovements;
}

export async function savePurchaseOrderToFirestore(po: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const clean = sanitizeForFirestore(po);
  await setDoc(doc(db, 'purchaseOrders', po.id), clean);
}

export async function syncAndMigratePurchaseOrders(localPOs: any[]): Promise<any[]> {
  const db = getFirestoreDb();
  if (!db) return localPOs;
  try {
    const colRef = collection(db, 'purchaseOrders');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remote: any[] = [];
      snap.forEach((d) => remote.push(d.data()));
      remote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return remote;
    } else if (localPOs.length > 0) {
      for (const po of localPOs) {
        await setDoc(doc(db, 'purchaseOrders', po.id), sanitizeForFirestore(po));
      }
    }
  } catch (err) {
    console.warn('[Firestore] Error syncing purchaseOrders:', err);
  }
  return localPOs;
}

export function subscribeToFirestoreProducts(onUpdate: (products: Product[]) => void): (() => void) | null {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const liveList: Product[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Product;
          if (item && item.nameEn) {
            liveList.push({
              ...item,
              id: d.id,
              sellingPrice: Number(item.sellingPrice) || 0,
              availableStock: Number(item.availableStock) || 0,
              discountPercent: Number(item.discountPercent) || 0,
              isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
            });
          }
        });
        onUpdate(liveList);
      }
    });
  } catch (e) {
    console.warn('[Firestore] Failed to set up snapshot listener on server:', e);
    return null;
  }
}

export async function saveDeliveryAgentToFirestore(agent: DeliveryAgent): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const clean = sanitizeForFirestore(agent);
  await setDoc(doc(db, 'deliveryAgents', agent.id), clean);
}

export async function deleteDeliveryAgentFromFirestore(agentId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await deleteDoc(doc(db, 'deliveryAgents', agentId));
}

export async function syncAndMigrateDeliveryAgents(localAgents: DeliveryAgent[]): Promise<DeliveryAgent[]> {
  const db = getFirestoreDb();
  if (!db) return localAgents;
  try {
    const colRef = collection(db, 'deliveryAgents');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remote: DeliveryAgent[] = [];
      snap.forEach((d) => remote.push(d.data() as DeliveryAgent));
      remote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log(`[Firestore] Synced ${remote.length} delivery agents from central Firestore.`);
      return remote;
    } else if (localAgents.length > 0) {
      console.log(`[Firestore] Central deliveryAgents collection empty. Migrating ${localAgents.length} agents...`);
      for (const a of localAgents) {
        await setDoc(doc(db, 'deliveryAgents', a.id), sanitizeForFirestore(a));
      }
      return localAgents;
    }
  } catch (err) {
    console.warn('[Firestore] Error syncing delivery agents:', err);
  }
  return localAgents;
}

export async function cleanupFirestoreDemoData(): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    // Delete orders
    const ordersSnap = await getDocs(collection(db, 'orders'));
    for (const d of ordersSnap.docs) {
      await deleteDoc(d.ref);
    }
    // Delete purchase orders
    const poSnap = await getDocs(collection(db, 'purchaseOrders'));
    for (const d of poSnap.docs) {
      await deleteDoc(d.ref);
    }
    // Delete stock movements
    const smSnap = await getDocs(collection(db, 'stockMovements'));
    for (const d of smSnap.docs) {
      await deleteDoc(d.ref);
    }
    console.log('[Firestore] Cleaned demo collections (orders, purchaseOrders, stockMovements). Products and agents preserved.');
  } catch (err) {
    console.warn('[Firestore] Error cleaning demo data:', err);
  }
}

export async function saveProductImageToFirestore(img: CloudProductImage): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  const clean = sanitizeForFirestore(img);
  await setDoc(doc(db, 'productImages', img.id), clean);
  console.log(`[Firestore] Saved cloud image record ${img.id} for product ${img.productId}`);
}

export async function getProductImageFromFirestore(imageId: string): Promise<CloudProductImage | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'productImages', imageId));
    if (snap.exists()) {
      return snap.data() as CloudProductImage;
    }
  } catch (err) {
    console.warn('[Firestore] Error getting product image:', err);
  }
  return null;
}

export async function deleteProductImageFromFirestore(imageId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'productImages', imageId));
    console.log(`[Firestore] Deleted cloud image record ${imageId}`);
  } catch (err) {
    console.warn('[Firestore] Error deleting product image:', err);
  }
}

export async function listProductImagesFromFirestore(): Promise<CloudProductImage[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'productImages'));
    const list: CloudProductImage[] = [];
    snap.forEach((d) => list.push(d.data() as CloudProductImage));
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('[Firestore] Error listing product images:', err);
    return [];
  }
}

export async function saveCustomerAccountToFirestore(account: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const clean = sanitizeForFirestore(account);
    await setDoc(doc(db, 'customerAccounts', account.customerId), clean);
  } catch (err) {
    console.warn('[Firestore] Error saving customer account to Firestore:', err);
  }
}

export async function syncAndMigrateCustomerAccounts(localAccounts: any[]): Promise<any[]> {
  const db = getFirestoreDb();
  if (!db) return localAccounts;
  try {
    const colRef = collection(db, 'customerAccounts');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteMap = new Map<string, any>();
      snap.forEach((d) => {
        remoteMap.set(d.id, d.data());
      });
      for (const local of localAccounts) {
        if (!remoteMap.has(local.customerId)) {
          await setDoc(doc(db, 'customerAccounts', local.customerId), sanitizeForFirestore(local));
          remoteMap.set(local.customerId, local);
        }
      }
      return Array.from(remoteMap.values());
    } else if (localAccounts.length > 0) {
      for (const a of localAccounts) {
        await setDoc(doc(db, 'customerAccounts', a.customerId), sanitizeForFirestore(a));
      }
      return localAccounts;
    }
  } catch (err) {
    console.warn('[Firestore] Error syncing customer accounts:', err);
  }
  return localAccounts;
}

export async function savePromotionalMediaToFirestore(media: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const clean = sanitizeForFirestore(media);
    await setDoc(doc(db, 'promotionalMedia', media.id), clean);
  } catch (err) {
    console.warn('[Firestore] Error saving promotional media to Firestore:', err);
  }
}

export async function deletePromotionalMediaFromFirestore(mediaId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'promotionalMedia', mediaId));
  } catch (err) {
    console.warn('[Firestore] Error deleting promotional media from Firestore:', err);
  }
}

export async function listPromotionalMediaFromFirestore(): Promise<any[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'promotionalMedia'));
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return list;
  } catch (err) {
    console.warn('[Firestore] Error listing promotional media from Firestore:', err);
    return [];
  }
}

export async function saveStarPointsTransactionToFirestore(tx: StarPointsTransaction): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const clean = sanitizeForFirestore(tx);
    await setDoc(doc(db, 'starPointsLedger', tx.id), clean);
  } catch (err) {
    console.warn('[Firestore] Error saving star points transaction to Firestore:', err);
  }
}

export async function syncStarPointsLedgerWithFirestore(localLedger: StarPointsTransaction[]): Promise<StarPointsTransaction[]> {
  const db = getFirestoreDb();
  if (!db) return localLedger;
  try {
    const colRef = collection(db, 'starPointsLedger');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteMap = new Map<string, StarPointsTransaction>();
      snap.forEach((d) => {
        remoteMap.set(d.id, d.data() as StarPointsTransaction);
      });
      for (const local of localLedger) {
        if (!remoteMap.has(local.id)) {
          await setDoc(doc(db, 'starPointsLedger', local.id), sanitizeForFirestore(local));
          remoteMap.set(local.id, local);
        }
      }
      return Array.from(remoteMap.values());
    } else if (localLedger.length > 0) {
      for (const tx of localLedger) {
        await setDoc(doc(db, 'starPointsLedger', tx.id), sanitizeForFirestore(tx));
      }
      return localLedger;
    }
  } catch (err) {
    console.warn('[Firestore] Error syncing star points ledger with Firestore:', err);
  }
  return localLedger;
}

export async function saveAnnualRewardToFirestore(reward: AnnualRewardRecord): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const clean = sanitizeForFirestore(reward);
    await setDoc(doc(db, 'annualRewards', reward.id), clean);
  } catch (err) {
    console.warn('[Firestore] Error saving annual reward to Firestore:', err);
  }
}

export async function deleteAnnualRewardFromFirestore(rewardId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'annualRewards', rewardId));
  } catch (err) {
    console.warn('[Firestore] Error deleting annual reward from Firestore:', err);
  }
}

export async function syncAnnualRewardsWithFirestore(localRewards: AnnualRewardRecord[]): Promise<AnnualRewardRecord[]> {
  const db = getFirestoreDb();
  if (!db) return localRewards;
  try {
    const colRef = collection(db, 'annualRewards');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteMap = new Map<string, AnnualRewardRecord>();
      snap.forEach((d) => {
        remoteMap.set(d.id, d.data() as AnnualRewardRecord);
      });
      for (const local of localRewards) {
        if (!remoteMap.has(local.id)) {
          await setDoc(doc(db, 'annualRewards', local.id), sanitizeForFirestore(local));
          remoteMap.set(local.id, local);
        }
      }
      return Array.from(remoteMap.values());
    } else if (localRewards.length > 0) {
      for (const rew of localRewards) {
        await setDoc(doc(db, 'annualRewards', rew.id), sanitizeForFirestore(rew));
      }
      return localRewards;
    }
  } catch (err) {
    console.warn('[Firestore] Error syncing annual rewards with Firestore:', err);
  }
  return localRewards;
}

export async function saveAnnualRewardsAnnouncementToFirestore(announcement: AnnualRewardsAnnouncement): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const clean = sanitizeForFirestore(announcement);
    await setDoc(doc(db, 'annualRewardAnnouncements', announcement.id), clean);
  } catch (err) {
    console.warn('[Firestore] Error saving annual rewards announcement to Firestore:', err);
  }
}

export async function getAnnualRewardsAnnouncementFromFirestore(cycle: string): Promise<AnnualRewardsAnnouncement | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const docSnap = await getDoc(doc(db, 'annualRewardAnnouncements', `announcement-${cycle}`));
    if (docSnap.exists()) {
      return docSnap.data() as AnnualRewardsAnnouncement;
    }
  } catch (err) {
    console.warn('[Firestore] Error retrieving announcement from Firestore:', err);
  }
  return null;
}



