const RESTAURANT_TOAST_SEEN_KEY = 'coconut:restaurant-toast:seen-order-session:v1';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[RestaurantToast] localStorage is unavailable:', error);
    return null;
  }
}

export function hasSeenRestaurantToastThisOrderSession(): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    return storage.getItem(RESTAURANT_TOAST_SEEN_KEY) === '1';
  } catch (error) {
    console.warn('[RestaurantToast] Unable to read order-session state:', error);
    return false;
  }
}

export function markRestaurantToastSeenForOrderSession(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(RESTAURANT_TOAST_SEEN_KEY, '1');
  } catch (error) {
    console.warn('[RestaurantToast] Unable to save order-session state:', error);
  }
}

export function resetRestaurantToastOrderSession(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(RESTAURANT_TOAST_SEEN_KEY);
  } catch (error) {
    console.warn('[RestaurantToast] Unable to reset order-session state:', error);
  }
}
