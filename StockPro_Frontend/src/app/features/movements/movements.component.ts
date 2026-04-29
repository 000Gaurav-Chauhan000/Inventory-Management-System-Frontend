import { Component, inject, signal, ViewChild, TemplateRef, effect, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES } from '../../core/constants/app.constants';
import { extractApiMessage, formatCurrency, formatDate, getValue, isGuid, isPositiveInteger } from '../../core/utils/utils';
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

const recordInitial = {
  productId: "",
  warehouseId: "",
  movementType: "STOCK_IN",
  quantity: 1,
  referenceType: "PO",
  referenceId: 0,
  unitCost: 0,
  notes: "",
};

const MOVEMENT_TYPES = ["STOCK_IN", "STOCK_OUT", "TRANSFER_IN", "TRANSFER_OUT"];
const MOVEMENT_LOAD_OPTIONS = [
  { value: "all", label: "All records", roles: ["ADMIN", "MANAGER"] },
  { value: "product", label: "Product ID", roles: ["ADMIN", "MANAGER"] },
  { value: "warehouse", label: "Warehouse ID", roles: ["ADMIN", "MANAGER"] },
  { value: "type", label: "Movement type", roles: ["ADMIN", "MANAGER"] },
  { value: "date", label: "Date range", roles: ["ADMIN", "MANAGER"] },
  { value: "reference", label: "Reference ID", roles: ["ADMIN", "MANAGER"] },
  { value: "stockin", label: "Stock-in summary", roles: ["ADMIN", "MANAGER"] },
  { value: "stockout", label: "Stock-out summary", roles: ["ADMIN", "MANAGER"] },
  { value: "history", label: "Product and warehouse history", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
  { value: "user", label: "User ID", roles: ["ADMIN", "MANAGER", "OFFICER", "STAFF"] },
];

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './movements.component.html'
})
export class MovementsComponent implements AfterViewInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  user = this.auth.user;
  
  get canRecord() { return this.user()?.role === "STAFF"; }
  get canAnalyse() { return ["ADMIN", "MANAGER"].includes(this.user()?.role || ''); }
  get canViewOwnHistory() { return ["ADMIN", "MANAGER", "OFFICER", "STAFF"].includes(this.user()?.role || ''); }
  
  get availableLoadModes() { return MOVEMENT_LOAD_OPTIONS.filter((option) => option.roles.includes(this.user()?.role || '')); }
  get currentLoadMode() {
    return this.availableLoadModes.some((option) => option.value === this.activeLoadMode())
      ? this.activeLoadMode()
      : this.availableLoadModes[0]?.value || "";
  }

  movements = signal<any[]>([]);
  
  recordForm = signal(getPersistentState('draft:movements:recordForm', recordInitial));
  activeLoadMode = signal(getPersistentState('draft:movements:activeLoadMode', "all"));
  filters = signal(getPersistentState('draft:movements:filters', {
    productId: "", warehouseId: "", type: "STOCK_IN", start: "", end: "", referenceId: "", userId: "",
  }));

  MOVEMENT_TYPES = MOVEMENT_TYPES;

  @ViewChild('movementCell') movementCell!: TemplateRef<any>;
  @ViewChild('productCell') productCell!: TemplateRef<any>;
  @ViewChild('warehouseCell') warehouseCell!: TemplateRef<any>;
  @ViewChild('quantityCell') quantityCell!: TemplateRef<any>;
  @ViewChild('unitCostCell') unitCostCell!: TemplateRef<any>;
  @ViewChild('balanceCell') balanceCell!: TemplateRef<any>;
  @ViewChild('dateCell') dateCell!: TemplateRef<any>;

  columns: Column[] = [];

  getValue = getValue;
  formatCurrency = formatCurrency;
  formatDate = formatDate;
  Object = Object;

  constructor() {
    effect(() => setPersistentState('draft:movements:recordForm', this.recordForm()));
    effect(() => setPersistentState('draft:movements:activeLoadMode', this.activeLoadMode()));
    effect(() => setPersistentState('draft:movements:filters', this.filters()));
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.columns = [
        { label: "Movement", key: '', render: this.movementCell },
        { label: "Product", key: '', render: this.productCell },
        { label: "Warehouse", key: '', render: this.warehouseCell },
        { label: "Quantity", key: '', render: this.quantityCell },
        { label: "Unit Cost", key: '', render: this.unitCostCell },
        { label: "Balance After", key: '', render: this.balanceCell },
        { label: "Date", key: '', render: this.dateCell },
      ];
    });
  }

  requireGuid(value: any, label: string) {
    if (!isGuid(value)) {
      this.notice.setNotice("", `Enter a valid ${label} in GUID format.`);
      return false;
    }
    return true;
  }

  requirePositiveIntegerValue(value: any, label: string) {
    if (!isPositiveInteger(value)) {
      this.notice.setNotice("", `Enter a valid numeric ${label}.`);
      return false;
    }
    return true;
  }

  toMovementRows(payload: any, mode = "") {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (typeof payload === "number" && (mode === "stockin" || mode === "stockout")) {
      return [
        {
          movementId: `${mode}-summary`,
          movementType: mode === "stockin" ? "STOCK_IN_SUMMARY" : "STOCK_OUT_SUMMARY",
          productId: this.filters().productId,
          warehouseId: "-",
          quantity: payload,
          unitCost: 0,
          balanceAfter: "-",
          movementDate: null,
          referenceType: "SUMMARY",
        },
      ];
    }
    return payload ? [payload] : [];
  }

  async loadWith(factory: () => Promise<any>, successMessage = "Movement data loaded.", mode = "") {
    this.notice.setNotice('', '');
    try {
      const response = await factory();
      this.movements.set(this.toMovementRows(response, mode));
      this.notice.setNotice(successMessage, "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleLoadMovements() {
    const filters = this.filters();
    switch (this.currentLoadMode) {
      case "all":
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.root)), "All movement records loaded.", "all");
        return;
      case "product":
        if (!this.requireGuid(filters.productId, "product ID")) return;
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.byProduct(filters.productId))), "Movement history for the product loaded.", "product");
        return;
      case "warehouse":
        if (!this.requirePositiveIntegerValue(filters.warehouseId, "warehouse ID")) return;
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.byWarehouse(filters.warehouseId))), "Warehouse movement records loaded.", "warehouse");
        return;
      case "type":
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.byType(filters.type))), "Movement type results loaded.", "type");
        return;
      case "date":
        if (!filters.start || !filters.end) {
          this.notice.setNotice("", "Select both start and end dates before running a date search.");
          return;
        }
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.byDateRange(filters.start, filters.end))), "Movement date range loaded.", "date");
        return;
      case "reference":
        if (!this.requirePositiveIntegerValue(filters.referenceId, "reference ID")) return;
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.byReference(filters.referenceId))), "Reference-linked movements loaded.", "reference");
        return;
      case "stockin":
        if (!this.requireGuid(filters.productId, "product ID")) return;
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.stockIn(filters.productId))), "Stock-in movement summary loaded.", "stockin");
        return;
      case "stockout":
        if (!this.requireGuid(filters.productId, "product ID")) return;
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.stockOut(filters.productId))), "Stock-out movement summary loaded.", "stockout");
        return;
      case "history":
        if (!this.requireGuid(filters.productId, "product ID") || !this.requirePositiveIntegerValue(filters.warehouseId, "warehouse ID")) return;
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.history(filters.productId, filters.warehouseId))), "Movement history loaded.", "history");
        return;
      case "user":
        if (!this.requireGuid(filters.userId, "user ID")) return;
        this.loadWith(() => firstValueFrom(this.http.get(API_ROUTES.movements.byUser(filters.userId))), "User movement history loaded.", "user");
        return;
      default:
        this.notice.setNotice("", "Choose how you want to load movement data.");
    }
  }

  async handleRecord() {
    this.notice.setNotice('', '');
    const form = this.recordForm();
    try {
      if (!this.requireGuid(form.productId, "product ID")) return;
      if (!this.requirePositiveIntegerValue(form.warehouseId, "warehouse ID")) return;

      await firstValueFrom(this.http.post(API_ROUTES.movements.root, {
        productId: form.productId,
        warehouseId: Number(form.warehouseId),
        movementType: form.movementType,
        quantity: Number(form.quantity),
        referenceType: form.referenceType,
        referenceId: Number(form.referenceId),
        unitCost: Number(form.unitCost),
        notes: form.notes,
      }));

      this.notice.setNotice("Movement recorded.", "");
      this.recordForm.set({ ...recordInitial });
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }
}
