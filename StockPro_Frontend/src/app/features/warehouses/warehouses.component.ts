import { Component, inject, OnInit, signal, ViewChild, TemplateRef, effect, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES } from '../../core/constants/app.constants';
import { extractApiMessage, formatDate, getValue, isGuid, isPositiveInteger, safeArray } from '../../core/utils/utils';
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

const warehouseInitial = { name: "", location: "", address: "", managerId: 0, capacity: 0, phone: "" };
const stockInitial = { warehouseId: "", productId: "", quantity: 0 };
const transferInitial = { fromWarehouse: "", toWarehouse: "", productId: "", quantity: 0 };

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './warehouses.component.html'
})
export class WarehousesComponent implements OnInit, AfterViewInit {
  Object = Object;
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  user = this.auth.user;

  get isAdmin() { return this.user()?.role === "ADMIN"; }
  get canUpdateStock() { return this.user()?.role === "STAFF"; }
  get canTransfer() { return ["STAFF", "MANAGER"].includes(this.user()?.role || ''); }

  warehouses = signal<any[]>([]);
  products = signal<any[]>([]);
  lowStock = signal<any[]>([]);

  warehouseForm = signal(getPersistentState('draft:warehouses:warehouseForm', warehouseInitial));
  stockForm = signal(getPersistentState('draft:warehouses:stockForm', stockInitial));
  transferForm = signal(getPersistentState('draft:warehouses:transferForm', transferInitial));
  editingId = signal(getPersistentState('draft:warehouses:editingId', ""));
  warehouseLookupId = signal(getPersistentState('draft:warehouses:lookupId', ""));
  
  stockLookup = signal<any>(null);
  stockActionLoading = signal<string | null>(null);

  @ViewChild('warehouseCell') warehouseCell!: TemplateRef<any>;
  @ViewChild('capacityCell') capacityCell!: TemplateRef<any>;
  @ViewChild('managerCell') managerCell!: TemplateRef<any>;
  @ViewChild('createdCell') createdCell!: TemplateRef<any>;
  @ViewChild('actionsCell') actionsCell!: TemplateRef<any>;
  @ViewChild('lsProdIdCell') lsProdIdCell!: TemplateRef<any>;
  @ViewChild('lsWhIdCell') lsWhIdCell!: TemplateRef<any>;
  @ViewChild('lsQtyCell') lsQtyCell!: TemplateRef<any>;

  columns: Column[] = [];
  lsColumns: Column[] = [];

  getValue = getValue;
  formatDate = formatDate;

  constructor() {
    effect(() => setPersistentState('draft:warehouses:warehouseForm', this.warehouseForm()));
    effect(() => setPersistentState('draft:warehouses:stockForm', this.stockForm()));
    effect(() => setPersistentState('draft:warehouses:transferForm', this.transferForm()));
    effect(() => setPersistentState('draft:warehouses:editingId', this.editingId()));
    effect(() => setPersistentState('draft:warehouses:lookupId', this.warehouseLookupId()));
  }

  ngOnInit() {
    this.loadWarehouses();
    this.loadProducts();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.columns = [
        { label: "Warehouse", key: '', render: this.warehouseCell },
        { label: "Capacity", key: '', render: this.capacityCell },
        { label: "Manager", key: '', render: this.managerCell },
        { label: "Created", key: '', render: this.createdCell }
      ];
      if (this.isAdmin) {
        this.columns.push({ label: "Actions", key: '', render: this.actionsCell });
      }

      this.lsColumns = [
        { label: "Product ID", key: '', render: this.lsProdIdCell },
        { label: "Warehouse", key: '', render: this.lsWhIdCell },
        { label: "Quantity", key: '', render: this.lsQtyCell },
      ];
    });
  }

  async loadWarehouses() {
    try {
      const res: any = await firstValueFrom(this.http.get(API_ROUTES.warehouse.warehouses));
      this.warehouses.set(safeArray(res));
      return true;
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
      return false;
    }
  }

  async loadProducts() {
    try {
      const res: any = await firstValueFrom(this.http.get(API_ROUTES.products.root));
      this.products.set(safeArray(res));
      return true;
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
      return false;
    }
  }

  async loadLowStock() {
    try {
      const res: any = await firstValueFrom(this.http.get(API_ROUTES.warehouse.lowStock));
      this.lowStock.set(safeArray(res));
      return true;
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
      return false;
    }
  }

  async handleWarehouseLookup() {
    this.notice.setNotice('', '');
    try {
      if (!this.warehouseLookupId()) {
        await this.loadWarehouses();
        return;
      }
      if (!isPositiveInteger(this.warehouseLookupId())) {
        this.notice.setNotice("", "Enter a valid numeric warehouse ID.");
        return;
      }
      const res: any = await firstValueFrom(this.http.get(API_ROUTES.warehouse.byId(this.warehouseLookupId())));
      this.warehouses.set(res ? [res] : []);
      this.notice.setNotice("Warehouse loaded.", "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleWarehouseSubmit() {
    this.notice.setNotice('', '');
    try {
      if (this.editingId()) {
        await firstValueFrom(this.http.put(API_ROUTES.warehouse.byId(this.editingId()), this.warehouseForm()));
        this.notice.setNotice("Warehouse updated.", "");
      } else {
        await firstValueFrom(this.http.post(API_ROUTES.warehouse.warehouses, this.warehouseForm()));
        this.notice.setNotice("Warehouse created.", "");
      }
      this.editingId.set("");
      this.warehouseForm.set({ ...warehouseInitial });
      await this.loadWarehouses();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  handleEdit(warehouse: any) {
    this.editingId.set(getValue(warehouse, "warehouseId", "WarehouseId"));
    this.warehouseForm.set({
      name: getValue(warehouse, "name", "Name"),
      location: getValue(warehouse, "location", "Location"),
      address: getValue(warehouse, "address", "Address"),
      managerId: getValue(warehouse, "managerId", "ManagerId") || 0,
      capacity: getValue(warehouse, "capacity", "Capacity") || 0,
      phone: getValue(warehouse, "phone", "Phone"),
    });
  }

  async handleDeactivate(warehouseId: string) {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.delete(API_ROUTES.warehouse.byId(warehouseId)));
      this.notice.setNotice("Warehouse deactivated.", "");
      await this.loadWarehouses();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleStockAction(action: string) {
    this.notice.setNotice('', '');
    const form = this.stockForm();
    if (!form.warehouseId || !form.productId || Number(form.quantity) <= 0) {
      this.notice.setNotice("", "Select a warehouse, select a product, and enter a quantity greater than 0.");
      return;
    }
    if (!isGuid(form.productId)) {
      this.notice.setNotice("", "Enter a valid product ID in GUID format.");
      return;
    }

    this.stockActionLoading.set(action);
    try {
      await firstValueFrom(this.http.post(API_ROUTES.warehouse.stockAction(action), {
        warehouseId: Number(form.warehouseId),
        productId: form.productId,
        quantity: Number(form.quantity),
      }));
      this.notice.setNotice(`Stock ${action} completed.`, "");
      
      const lookup = this.stockLookup();
      if (lookup && lookup.warehouseId === Number(form.warehouseId) && lookup.productId === form.productId) {
        try {
          const res = await firstValueFrom(this.http.get(API_ROUTES.warehouse.stockLevel(form.warehouseId, form.productId)));
          this.stockLookup.set(res);
        } catch {}
      }
      this.stockForm.set({ ...stockInitial });
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    } finally {
      this.stockActionLoading.set(null);
    }
  }

  async handleTransfer() {
    this.notice.setNotice('', '');
    const form = this.transferForm();
    try {
      if (!isPositiveInteger(form.fromWarehouse) || !isPositiveInteger(form.toWarehouse)) {
        this.notice.setNotice("", "Select valid source and destination warehouse IDs.");
        return;
      }
      if (Number(form.fromWarehouse) === Number(form.toWarehouse)) {
        this.notice.setNotice("", "Choose two different warehouses for a transfer.");
        return;
      }
      if (Number(form.quantity) <= 0) {
        this.notice.setNotice("", "Enter a transfer quantity greater than 0.");
        return;
      }
      if (!isGuid(form.productId)) {
        this.notice.setNotice("", "Enter a valid product ID in GUID format.");
        return;
      }
      await firstValueFrom(this.http.post(API_ROUTES.warehouse.transfer, {
        fromWarehouse: Number(form.fromWarehouse),
        toWarehouse: Number(form.toWarehouse),
        productId: form.productId,
        quantity: Number(form.quantity),
      }));
      this.notice.setNotice("Stock transferred.", "");
      this.transferForm.set({ ...transferInitial });
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleStockLookup() {
    this.notice.setNotice('', '');
    const form = this.stockForm();
    try {
      if (!isPositiveInteger(form.warehouseId)) {
        this.notice.setNotice("", "Select a valid numeric warehouse ID.");
        return;
      }
      if (!isGuid(form.productId)) {
        this.notice.setNotice("", "Enter a valid product ID in GUID format.");
        return;
      }
      const res = await firstValueFrom(this.http.get(API_ROUTES.warehouse.stockLevel(form.warehouseId, form.productId)));
      this.stockLookup.set(res);
      this.notice.setNotice("Stock level loaded.", "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleLoadLowStock() {
    this.notice.setNotice('', '');
    try {
      const loaded = await this.loadLowStock();
      if (loaded) {
        this.notice.setNotice("Low-stock warehouse items loaded.", "");
      }
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async showAll() {
    this.warehouseLookupId.set("");
    this.notice.setNotice('', '');
    const loaded = await this.loadWarehouses();
    if (loaded) {
      this.notice.setNotice("All warehouses loaded.", "");
    }
  }
}
