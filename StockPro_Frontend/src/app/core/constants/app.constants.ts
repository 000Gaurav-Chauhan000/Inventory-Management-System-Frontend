export const TOKEN_KEY = 'stockpro_token';

export const ROLES = ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'];
export const PUBLIC_SIGNUP_ROLES = ['STAFF', 'MANAGER', 'OFFICER'];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Inventory Manager',
  OFFICER: 'Purchase Officer',
  STAFF: 'Warehouse Staff',
};

// Using a simple object for environments for now.
export const environment = {
  gatewayApi: 'http://localhost:5000'
};

export const URLS = {
  auth: `${environment.gatewayApi}/api/auth`,
  product: `${environment.gatewayApi}/api/products`,
  warehouse: `${environment.gatewayApi}/api`,
  supplier: `${environment.gatewayApi}/api/suppliers`,
  purchase: `${environment.gatewayApi}/api/purchase-orders`,
  movement: `${environment.gatewayApi}/api/movements`,
  alert: `${environment.gatewayApi}/api/alerts`,
  report: `${environment.gatewayApi}/api/reports`,
};

export const API_ROUTES = {
  auth: {
    login: `${URLS.auth}/login`,
    register: `${URLS.auth}/register`,
    profile: `${URLS.auth}/profile`,
    password: `${URLS.auth}/password`,
    users: `${URLS.auth}/users`,
    deactivate: (userId: string) => `${URLS.auth}/deactivate?userId=${userId}`,
    refresh: `${URLS.auth}/refresh`,
    logout: `${URLS.auth}/logout`,
  },
  products: {
    root: `${URLS.product}/`,
    byId: (id: string) => `${URLS.product}/${id}`,
    bySku: (sku: string) => `${URLS.product}/sku/${sku}`,
    byCategory: (category: string) => `${URLS.product}/category/${category}`,
    byBrand: (brand: string) => `${URLS.product}/brand/${brand}`,
    byBarcode: (barcode: string) => `${URLS.product}/barcode/${barcode}`,
    search: (name: string) => `${URLS.product}/search?name=${name}`,
    lowStock: `${URLS.product}/lowStock`,
    deactivate: (id: string) => `${URLS.product}/${id}/deactivate`,
    remove: (id: string) => `${URLS.product}/${id}`,
  },
  warehouse: {
    warehouses: `${URLS.warehouse}/warehouses`,
    byId: (id: string) => `${URLS.warehouse}/warehouses/${id}`,
    stockLevel: (warehouseId: string, productId: string) =>
      `${URLS.warehouse}/stock/${warehouseId}/${productId}`,
    stockAction: (action: string) => `${URLS.warehouse}/stock/${action}`,
    transfer: `${URLS.warehouse}/stock/transfer`,
    lowStock: `${URLS.warehouse}/stock/low`,
  },
  suppliers: {
    root: `${URLS.supplier}/`,
    byId: (id: string) => `${URLS.supplier}/${id}`,
    search: (name: string) => `${URLS.supplier}/search?name=${name}`,
    byCity: (city: string) => `${URLS.supplier}/city?city=${city}`,
    byCountry: (country: string) => `${URLS.supplier}/country?country=${country}`,
    deactivate: (id: string) => `${URLS.supplier}/${id}/deactivate`,
    rating: (id: string, rating: number) => `${URLS.supplier}/${id}/rating?rating=${rating}`,
    remove: (id: string) => `${URLS.supplier}/${id}`,
  },
  purchaseOrders: {
    create: `${URLS.purchase}/create`,
    byId: (id: string) => `${URLS.purchase}/${id}`,
    byStatus: (status: string) => `${URLS.purchase}/status/${status}`,
    bySupplier: (supplierId: string) => `${URLS.purchase}/supplier/${supplierId}`,
    byWarehouse: (warehouseId: string) => `${URLS.purchase}/warehouse/${warehouseId}`,
    byDateRange: (start: string, end: string) => `${URLS.purchase}/dateRange?start=${start}&end=${end}`,
    submit: (id: string) => `${URLS.purchase}/${id}/submit`,
    approve: (id: string) => `${URLS.purchase}/${id}/approve`,
    cancel: (id: string) => `${URLS.purchase}/${id}/cancel`,
    receive: (id: string) => `${URLS.purchase}/${id}/receive`,
    update: (id: string) => `${URLS.purchase}/${id}`,
  },
  movements: {
    root: `${URLS.movement}/`,
    byProduct: (productId: string) => `${URLS.movement}/product/${productId}`,
    byWarehouse: (warehouseId: string) => `${URLS.movement}/warehouse/${warehouseId}`,
    byType: (type: string) => `${URLS.movement}/type?type=${type}`,
    byDateRange: (start: string, end: string) => `${URLS.movement}/date?start=${start}&end=${end}`,
    byReference: (referenceId: string) => `${URLS.movement}/reference/${referenceId}`,
    stockIn: (productId: string) => `${URLS.movement}/stockin/${productId}`,
    stockOut: (productId: string) => `${URLS.movement}/stockout/${productId}`,
    history: (productId: string, warehouseId: string) =>
      `${URLS.movement}/history?productId=${productId}&warehouseId=${warehouseId}`,
    byUser: (userId: string) => `${URLS.movement}/user/${userId}`,
  },
  alerts: {
    root: `${URLS.alert}/`,
    bulk: `${URLS.alert}/bulk`,
    byRecipient: (recipientId: string) => `${URLS.alert}/${recipientId}`,
    unread: (recipientId: string) => `${URLS.alert}/${recipientId}/unread`,
    unacknowledged: (recipientId: string) => `${URLS.alert}/${recipientId}/unacknowledged`,
    readAll: (recipientId: string) => `${URLS.alert}/${recipientId}/read-all`,
    markRead: (alertId: string) => `${URLS.alert}/${alertId}/read`,
    acknowledge: (alertId: string) => `${URLS.alert}/${alertId}/ack`,
    remove: (alertId: string) => `${URLS.alert}/${alertId}`,
  },
  reports: {
    totalValue: `${URLS.report}/totalValue`,
    byWarehouse: (warehouseId: string) => `${URLS.report}/byWarehouse?warehouseId=${warehouseId}`,
    turnover: (start: string, end: string) => `${URLS.report}/turnover?start=${start}&end=${end}`,
    lowStock: `${URLS.report}/lowStock`,
    topMoving: `${URLS.report}/topMoving`,
    slowMoving: `${URLS.report}/slowMoving`,
    deadStock: `${URLS.report}/deadStock`,
    poSummary: `${URLS.report}/poSummary`,
    generate: `${URLS.report}/generateReport`,
  },
};

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', roles: ROLES },
  { to: '/products', label: 'Products', roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] },
  { to: '/warehouses', label: 'Warehouses', roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] },
  { to: '/suppliers', label: 'Suppliers', roles: ['OFFICER'] },
  { to: '/purchase-orders', label: 'Purchase Orders', roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] },
  { to: '/movements', label: 'Movements', roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] },
  { to: '/alerts', label: 'Alerts', roles: ROLES },
  { to: '/reports', label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Users', roles: ['ADMIN'] },
  { to: '/profile', label: 'Profile', roles: ROLES },
];

export const DASHBOARD_COPY: Record<string, { title: string; blurb: string }> = {
  ADMIN: {
    title: 'Control every service from one place',
    blurb:
      'Manage users, configure warehouses, watch total stock value, and create internal admins without exposing admin signup publicly.',
  },
  MANAGER: {
    title: 'Keep inventory healthy and visible',
    blurb:
      'Track products, watch low-stock signals, monitor transfers, and review analytics across every warehouse.',
  },
  OFFICER: {
    title: 'Run procurement without losing context',
    blurb:
      'Create suppliers, raise purchase orders, follow approval flow, and keep receipts moving against demand.',
  },
  STAFF: {
    title: 'Handle stock activity quickly',
    blurb:
      'Update stock, reserve inventory, transfer quantities, and record daily movement activity from the warehouse floor.',
  },
};
