export type JsonObject = Record<string, unknown>;

export type RouterLike = {
  replace: (url: string) => void;
};

export type StoragePort = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  getAllKeys: () => string[];
};

export type NavigationPort = {
  replaceUrl: (url: string) => void;
  replaceWithPaymentId: (pathname: string, paymentDocId: string | null) => void;
  reloadPage: () => void;
};

export type NotificationPort = {
  alert: (message: string) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type HttpPort = {
  getJson: <T = JsonObject>(url: string) => Promise<{ ok: boolean; data: T }>;
  postJson: <T = JsonObject>(
    url: string,
    body: JsonObject,
  ) => Promise<{ ok: boolean; data: T }>;
};

export type FirestorePort = {
  getDocById: <T = JsonObject>(
    collectionName: string,
    id: string,
  ) => Promise<{ exists: boolean; data: T | null }>;
  updateDocById: (
    collectionName: string,
    id: string,
    payload: JsonObject,
  ) => Promise<void>;
  deleteDocById: (collectionName: string, id: string) => Promise<void>;
};

export type ReservationSideEffects = {
  storage: StoragePort;
  navigation: NavigationPort;
  notification: NotificationPort;
  http: HttpPort;
  firestore: FirestorePort;
};
