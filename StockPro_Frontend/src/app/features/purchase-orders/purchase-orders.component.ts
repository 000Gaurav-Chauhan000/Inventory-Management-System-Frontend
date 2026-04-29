import { Component, inject, OnInit, signal, ViewChild, TemplateRef, effect, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES } from '../../core/constants/app.constants';
import { extractApiMessage, formatCurrency, formatDate, getValue, isGuid, isPositiveInteger, safeArray } from '../../core/utils/utils';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DataTableComponent, Column } from '../../shared/components/data-table/data-table.component';
import { FloatingNoticeComponent } from '../../shared/components/floating-notice/floating-notice.component';
import { firstValueFrom } from 'rxjs';

function getPersistentState<T>(key: string, initial: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initial;
  } catch {
    return initial;
  }
}
function setPersistentState(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const orderInitial = {
  supplierId: "", warehouseId: "", expectedDate: "", notes: "", referenceNumber: "", items: [{ productId: "", quantity: 1, unitCost: 0 }],
};

const editInitial = {
  poId: "", supplierId: "", warehouseId: "", expectedDate: "", notes: "", referenceNumber: "",
};

const receiveInitial: any = {
  poId: "", items: [{ lineItemId: "", receivedQty: 1, productId: "", quantity: 0, previouslyReceived: 0 }],
};

const ORDER_LOAD_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "id", label: "Purchase order ID" },
  { value: "supplier", label: "Supplier ID" },
  { value: "warehouse", label: "Warehouse ID" },
  { value: "dateRange", label: "Date range" },
];

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './purchase-orders.component.html'
})
export class PurchaseOrdersComponent implements OnInit, AfterViewInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  user = this.auth.user;
  get canCreate() { return this.user()?.role === "OFFICER"; }
  get canApprove() { return ["OFFICER", "MANAGER"].includes(this.user()?.role || ''); }
  get canReceive() { return this.user()?.role?.toUpperCase() === "STAFF"; }
  get canBrowse() { return ["ADMIN", "MANAGER", "OFFICER", "STAFF"].includes(this.user()?.role?.toUpperCase() || ''); }

  orders = signal<any[]>([]);
  activeLoadMode = signal(getPersistentState('draft:purchaseOrders:activeLoadMode', "status"));
  resultLabel = signal("No purchase order query has been run yet.");
  filters = signal(getPersistentState('draft:purchaseOrders:filters', {
    id: "", status: "APPROVED", supplierId: "", warehouseId: "", start: "", end: "",
  }));
  orderForm = signal(getPersistentState('draft:purchaseOrders:createForm', orderInitial));
  editForm = signal(getPersistentState('draft:purchaseOrders:editForm', editInitial));
  receiveForm = signal(getPersistentState('draft:purchaseOrders:receiveForm', receiveInitial));
  view = signal("list");

  ORDER_LOAD_OPTIONS = ORDER_LOAD_OPTIONS;

  @ViewChild('poCell') poCell!: TemplateRef<any>;
  @ViewChild('supplierCell') supplierCell!: TemplateRef<any>;
  @ViewChild('warehouseCell') warehouseCell!: TemplateRef<any>;
  @ViewChild('totalCell') totalCell!: TemplateRef<any>;
  @ViewChild('expectedCell') expectedCell!: TemplateRef<any>;
  @ViewChild('itemsCell') itemsCell!: TemplateRef<any>;
  @ViewChild('actionsCell') actionsCell!: TemplateRef<any>;

  columns: Column[] = [];

  getValue = getValue;
  formatCurrency = formatCurrency;
  formatDate = formatDate;
  Object = Object;
  safeArray = safeArray;
  Math = Math;

  constructor() {
    effect(() => setPersistentState('draft:purchaseOrders:activeLoadMode', this.activeLoadMode()));
    effect(() => setPersistentState('draft:purchaseOrders:filters', this.filters()));
    effect(() => setPersistentState('draft:purchaseOrders:createForm', this.orderForm()));
    effect(() => setPersistentState('draft:purchaseOrders:editForm', this.editForm()));
    effect(() => setPersistentState('draft:purchaseOrders:receiveForm', this.receiveForm()));
  }

  ngOnInit() {
    if (this.canBrowse) {
      this.handleLoadOrders(false);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.columns = [
        { label: "PO", key: '', render: this.poCell },
        { label: "Supplier", key: '', render: this.supplierCell },
        { label: "Warehouse", key: '', render: this.warehouseCell },
        { label: "Total", key: '', render: this.totalCell },
        { label: "Expected", key: '', render: this.expectedCell },
        { label: "Items", key: '', render: this.itemsCell },
        { label: "Actions", key: '', render: this.actionsCell },
      ];
    });
  }

  async runLoader(promiseFactory: () => Promise<any>, successMessage = "Purchase orders loaded.", mode = "", label = "", showNotice = true) {
    if (showNotice) this.notice.setNotice('', '');
    try {
      const response = await promiseFactory();
      const payload = response;
      const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
      this.orders.set(rows);
      this.activeLoadMode.set(mode);
      this.resultLabel.set(label ? `${label} (${rows.length} result${rows.length === 1 ? "" : "s"})` : `${rows.length} result${rows.length === 1 ? "" : "s"} loaded.`);
      if (showNotice) this.notice.setNotice(successMessage, "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  requirePositiveInteger(value: any, label: string) {
    if (!isPositiveInteger(value)) {
      this.notice.setNotice("", `Enter a valid numeric ${label}.`);
      return false;
    }
    return true;
  }

  updateItem(index: number, key: string, value: any) {
    const current = this.orderForm();
    const items = [...current.items];
    items[index] = { ...items[index], [key]: value };
    this.orderForm.set({ ...current, items });
  }

  updateReceiveItem(index: number, key: string, value: any) {
    const current = this.receiveForm();
    const items = [...current.items];
    items[index] = { ...items[index], [key]: value };
    this.receiveForm.set({ ...current, items });
  }

  addLineItem() {
    const current = this.orderForm();
    this.orderForm.set({
      ...current,
      items: [...current.items, { productId: "", quantity: 1, unitCost: 0 }],
    });
  }

  handleLoadOrders(showNotice = true) {
    const mode = this.activeLoadMode() || "status";
    const filters = this.filters();
    switch (mode) {
      case "id":
        if (!this.requirePositiveInteger(filters.id, "purchase order ID")) return;
        this.runLoader(() => firstValueFrom(this.http.get(API_ROUTES.purchaseOrders.byId(filters.id))), "Purchase order loaded.", "id", `Purchase order #${filters.id}`, showNotice);
        return;
      case "status":
        this.runLoader(() => firstValueFrom(this.http.get(API_ROUTES.purchaseOrders.byStatus(filters.status))), "Purchase orders filtered by status.", "status", `Status: ${filters.status}`, showNotice);
        return;
      case "supplier":
        if (!this.requirePositiveInteger(filters.supplierId, "supplier ID")) return;
        this.runLoader(() => firstValueFrom(this.http.get(API_ROUTES.purchaseOrders.bySupplier(filters.supplierId))), "Purchase orders filtered by supplier.", "supplier", `Supplier ID: ${filters.supplierId}`, showNotice);
        return;
      case "warehouse":
        if (!this.requirePositiveInteger(filters.warehouseId, "warehouse ID")) return;
        this.runLoader(() => firstValueFrom(this.http.get(API_ROUTES.purchaseOrders.byWarehouse(filters.warehouseId))), "Purchase orders filtered by warehouse.", "warehouse", `Warehouse ID: ${filters.warehouseId}`, showNotice);
        return;
      case "dateRange":
        if (!filters.start || !filters.end) {
          if (showNotice) this.notice.setNotice("", "Select both start and end dates before running a date range search.");
          return;
        }
        this.runLoader(() => firstValueFrom(this.http.get(API_ROUTES.purchaseOrders.byDateRange(filters.start, filters.end))), "Purchase orders filtered by date range.", "dateRange", `Date range: ${filters.start} to ${filters.end}`, showNotice);
        return;
      default:
        this.notice.setNotice("", "Choose how you want to load purchase orders.");
    }
  }

  async handleCreate() {
    this.notice.setNotice('', '');
    const form = this.orderForm();
    try {
      if (!this.requirePositiveInteger(form.supplierId, "supplier ID")) return;
      if (!this.requirePositiveInteger(form.warehouseId, "warehouse ID")) return;
      if (form.items.some((item) => !isGuid(item.productId))) {
        this.notice.setNotice("", "Each line item needs a valid product ID in GUID format.");
        return;
      }
      await firstValueFrom(this.http.post(API_ROUTES.purchaseOrders.create, {
        supplierId: Number(form.supplierId),
        warehouseId: Number(form.warehouseId),
        expectedDate: form.expectedDate || null,
        notes: form.notes,
        referenceNumber: form.referenceNumber,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      }));
      this.notice.setNotice("Purchase order created.", "");
      this.orderForm.set({ ...orderInitial });
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleUpdate() {
    this.notice.setNotice('', '');
    const form = this.editForm();
    try {
      if (!this.requirePositiveInteger(form.poId, "purchase order ID")) return;
      if (!this.requirePositiveInteger(form.supplierId, "supplier ID")) return;
      if (!this.requirePositiveInteger(form.warehouseId, "warehouse ID")) return;
      await firstValueFrom(this.http.put(API_ROUTES.purchaseOrders.update(form.poId), {
        supplierId: Number(form.supplierId),
        warehouseId: Number(form.warehouseId),
        expectedDate: form.expectedDate || null,
        notes: form.notes,
        referenceNumber: form.referenceNumber,
      }));
      this.notice.setNotice("Purchase order updated.", "");
      this.editForm.set({ ...editInitial });
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleApprove(poId: string) {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.put(API_ROUTES.purchaseOrders.approve(poId), {}));
      this.notice.setNotice("Purchase order approved.", "");
      this.handleLoadOrders(false);
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleSubmitForApproval(poId: string) {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.put(API_ROUTES.purchaseOrders.submit(poId), {}));
      this.notice.setNotice("Purchase order submitted for approval.", "");
      this.handleLoadOrders(false);
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleCancel(poId: string) {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.put(API_ROUTES.purchaseOrders.cancel(poId), {}));
      this.notice.setNotice("Purchase order cancelled.", "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleReceive() {
    this.notice.setNotice('', '');
    const form = this.receiveForm();
    try {
      if (!this.requirePositiveInteger(form.poId, "purchase order ID")) return;
      if (form.items.some((item: any) => !isPositiveInteger(item.lineItemId))) {
        this.notice.setNotice("", "Each receipt line needs a valid numeric line item ID.");
        return;
      }
      await firstValueFrom(this.http.post(API_ROUTES.purchaseOrders.receive(form.poId), {
        items: form.items.map((item: any) => ({
          lineItemId: Number(item.lineItemId),
          receivedQty: Number(item.receivedQty),
        })),
      }));
      this.notice.setNotice("Goods receipt recorded.", "");
      this.receiveForm.set({ ...receiveInitial });
      this.view.set("list");
      this.handleLoadOrders(false);
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  loadIntoEdit(order: any) {
    this.editForm.set({
      poId: getValue(order, "poId", "PoId"),
      supplierId: getValue(order, "supplierId", "SupplierId"),
      warehouseId: getValue(order, "warehouseId", "WarehouseId"),
      expectedDate: getValue(order, "expectedDate", "ExpectedDate")?.slice?.(0, 10) || "",
      notes: getValue(order, "notes", "Notes") || "",
      referenceNumber: getValue(order, "referenceNumber", "ReferenceNumber") || "",
    });
  }

  loadIntoReceive(order: any) {
    const poId = getValue(order, "poId", "PoId");
    const items = safeArray(getValue(order, "items", "Items")).map((item: any) => {
      const lineItemId = getValue(item, "lineItemId", "LineItemId");
      const productId = getValue(item, "productId", "ProductId");
      const quantity = getValue(item, "quantity", "Quantity");
      const receivedQty = getValue(item, "receivedQty", "ReceivedQty") || 0;
      return { 
        lineItemId, 
        productId, 
        quantity, 
        previouslyReceived: receivedQty, 
        receivedQty: Math.max(0, quantity - receivedQty)
      };
    });
    this.receiveForm.set({ poId, items });
    this.view.set("receive");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
