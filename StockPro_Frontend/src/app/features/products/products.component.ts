import { Component, inject, OnInit, signal, ViewChild, TemplateRef, effect, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES } from '../../core/constants/app.constants';
import { extractApiMessage, formatCurrency, getValue, isGuid, safeArray } from '../../core/utils/utils';
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const initialForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  brand: "",
  unitOfMeasure: "",
  costPrice: 0,
  sellingPrice: 0,
  reorderLevel: 0,
  maxStockLevel: 0,
  leadTimeDays: 0,
  imageUrl: "",
  isActive: true,
  barcode: "",
};

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './products.component.html'
})
export class ProductsComponent implements OnInit, AfterViewInit {
  Object = Object;
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  canManage = this.auth.user()?.role === "MANAGER";

  products = signal<any[]>([]);
  lowStock = signal<any[]>([]);

  form = signal(getPersistentState('draft:products:form', initialForm));
  editingId = signal(getPersistentState('draft:products:editingId', ""));
  lookupMode = signal(getPersistentState('draft:products:lookupMode', "name"));
  lookupValue = signal(getPersistentState('draft:products:lookupValue', ""));

  @ViewChild('productCell') productCell!: TemplateRef<any>;
  @ViewChild('priceCell') priceCell!: TemplateRef<any>;
  @ViewChild('rulesCell') rulesCell!: TemplateRef<any>;
  @ViewChild('statusCell') statusCell!: TemplateRef<any>;
  @ViewChild('actionsCell') actionsCell!: TemplateRef<any>;
  
  @ViewChild('lsProductCell') lsProductCell!: TemplateRef<any>;

  columns: Column[] = [];
  lsColumns: Column[] = [];

  getValue = getValue;
  formatCurrency = formatCurrency;

  constructor() {
    effect(() => setPersistentState('draft:products:form', this.form()));
    effect(() => setPersistentState('draft:products:editingId', this.editingId()));
    effect(() => setPersistentState('draft:products:lookupMode', this.lookupMode()));
    effect(() => setPersistentState('draft:products:lookupValue', this.lookupValue()));
  }

  ngOnInit() {
    this.loadProducts();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.columns = [
        { label: 'Product', key: '', render: this.productCell },
        { label: 'Sell Price', key: '', render: this.priceCell },
        { label: 'Stock Rules', key: '', render: this.rulesCell },
        { label: 'Status', key: '', render: this.statusCell }
      ];
      if (this.canManage) {
        this.columns.push({ label: 'Actions', key: '', render: this.actionsCell });
      }

      this.lsColumns = [
        { label: 'Product', key: '', render: this.lsProductCell },
        { label: 'SKU', key: 'sku' },
        { label: 'Reorder', key: 'reorderLevel' }
      ];
    });
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

  async handleLookup() {
    this.notice.setNotice('', '');
    try {
      if (!this.lookupValue().trim()) {
        await this.loadProducts();
        return;
      }

      if (this.lookupMode() === "id" && !isGuid(this.lookupValue())) {
        this.notice.setNotice("", "Enter a valid product ID in GUID format.");
        return;
      }

      const value = this.lookupValue().trim();
      let path = API_ROUTES.products.search(value);

      if (this.lookupMode() === "id") path = API_ROUTES.products.byId(value);
      else if (this.lookupMode() === "sku") path = API_ROUTES.products.bySku(value);
      else if (this.lookupMode() === "category") path = API_ROUTES.products.byCategory(value);
      else if (this.lookupMode() === "brand") path = API_ROUTES.products.byBrand(value);
      else if (this.lookupMode() === "barcode") path = API_ROUTES.products.byBarcode(value);

      const res: any = await firstValueFrom(this.http.get(path));
      this.products.set(Array.isArray(res) ? res : res ? [res] : []);
      this.notice.setNotice("Product results loaded.", "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleLowStock() {
    this.notice.setNotice('', '');
    try {
      const res: any = await firstValueFrom(this.http.get(API_ROUTES.products.lowStock));
      this.lowStock.set(safeArray(res));
      this.notice.setNotice("Low-stock products loaded.", "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleSubmit() {
    this.notice.setNotice('', '');
    try {
      if (this.editingId()) {
        await firstValueFrom(this.http.put(API_ROUTES.products.byId(this.editingId()), this.form()));
        this.notice.setNotice("Product updated.", "");
      } else {
        await firstValueFrom(this.http.post(API_ROUTES.products.root, this.form()));
        this.notice.setNotice("Product created.", "");
      }

      this.form.set({ ...initialForm });
      this.editingId.set("");
      await this.loadProducts();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  handleEdit(product: any) {
    this.editingId.set(getValue(product, "productId", "ProductId"));
    this.form.set({
      sku: getValue(product, "sku", "Sku"),
      name: getValue(product, "name", "Name"),
      description: getValue(product, "description", "Description"),
      category: getValue(product, "category", "Category"),
      brand: getValue(product, "brand", "Brand"),
      unitOfMeasure: getValue(product, "unitOfMeasure", "UnitOfMeasure"),
      costPrice: getValue(product, "costPrice", "CostPrice") || 0,
      sellingPrice: getValue(product, "sellingPrice", "SellingPrice") || 0,
      reorderLevel: getValue(product, "reorderLevel", "ReorderLevel") || 0,
      maxStockLevel: getValue(product, "maxStockLevel", "MaxStockLevel") || 0,
      leadTimeDays: getValue(product, "leadTimeDays", "LeadTimeDays") || 0,
      imageUrl: getValue(product, "imageUrl", "ImageUrl"),
      isActive: getValue(product, "isActive", "IsActive"),
      barcode: getValue(product, "barcode", "Barcode"),
    });
  }

  async handleDeactivate(productId: string) {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.put(API_ROUTES.products.deactivate(productId), null));
      this.notice.setNotice("Product deactivated.", "");
      await this.loadProducts();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleDelete(productId: string) {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.delete(API_ROUTES.products.remove(productId)));
      this.notice.setNotice("Product deleted.", "");
      if (this.editingId() === productId) {
        this.editingId.set("");
        this.form.set({ ...initialForm });
      }
      await this.loadProducts();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleRefresh() {
    this.notice.setNotice('', '');
    try {
      const loaded = await this.loadProducts();
      if (loaded) {
        this.notice.setNotice("Products refreshed.", "");
      }
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }
}
