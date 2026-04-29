import { Component, inject, OnInit, signal, ViewChild, TemplateRef, effect, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES } from '../../core/constants/app.constants';
import { extractApiMessage, getValue, isPositiveInteger, safeArray } from '../../core/utils/utils';
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

const initialForm = {
  name: "", contactPerson: "", email: "", phone: "", address: "", city: "", country: "", taxId: "", paymentTerms: "", leadTimeDays: 0,
};

const initialRating = {
  supplierId: "", value: 4,
};

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './suppliers.component.html'
})
export class SuppliersComponent implements OnInit, AfterViewInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  suppliers = signal<any[]>([]);

  form = signal(getPersistentState('draft:suppliers:form', initialForm));
  editingId = signal(getPersistentState('draft:suppliers:editingId', ""));
  lookupMode = signal(getPersistentState('draft:suppliers:lookupMode', "name"));
  lookupValue = signal(getPersistentState('draft:suppliers:lookupValue', ""));
  rating = signal(getPersistentState('draft:suppliers:rating', initialRating));

  @ViewChild('supplierCell') supplierCell!: TemplateRef<any>;
  @ViewChild('cityCell') cityCell!: TemplateRef<any>;
  @ViewChild('countryCell') countryCell!: TemplateRef<any>;
  @ViewChild('leadTimeCell') leadTimeCell!: TemplateRef<any>;
  @ViewChild('ratingCell') ratingCell!: TemplateRef<any>;
  @ViewChild('actionsCell') actionsCell!: TemplateRef<any>;

  columns: Column[] = [];

  getValue = getValue;
  Object = Object;

  constructor() {
    effect(() => setPersistentState('draft:suppliers:form', this.form()));
    effect(() => setPersistentState('draft:suppliers:editingId', this.editingId()));
    effect(() => setPersistentState('draft:suppliers:lookupMode', this.lookupMode()));
    effect(() => setPersistentState('draft:suppliers:lookupValue', this.lookupValue()));
    effect(() => setPersistentState('draft:suppliers:rating', this.rating()));
  }

  ngOnInit() {
    this.loadSuppliers();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.columns = [
        { label: "Supplier", key: '', render: this.supplierCell },
        { label: "City", key: '', render: this.cityCell },
        { label: "Country", key: '', render: this.countryCell },
        { label: "Lead Time", key: '', render: this.leadTimeCell },
        { label: "Rating", key: '', render: this.ratingCell },
        { label: "Actions", key: '', render: this.actionsCell },
      ];
    });
  }

  async loadSuppliers() {
    try {
      const res: any = await firstValueFrom(this.http.get(API_ROUTES.suppliers.root));
      this.suppliers.set(safeArray(res));
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
        await this.loadSuppliers();
        return;
      }
      if (this.lookupMode() === "id" && !isPositiveInteger(this.lookupValue())) {
        this.notice.setNotice("", "Enter a valid numeric supplier ID.");
        return;
      }

      const value = this.lookupValue().trim();
      let path = API_ROUTES.suppliers.search(value);

      if (this.lookupMode() === "id") path = API_ROUTES.suppliers.byId(value);
      else if (this.lookupMode() === "city") path = API_ROUTES.suppliers.byCity(value);
      else if (this.lookupMode() === "country") path = API_ROUTES.suppliers.byCountry(value);

      const res: any = await firstValueFrom(this.http.get(path));
      this.suppliers.set(Array.isArray(res) ? res : res ? [res] : []);
      this.notice.setNotice("Supplier results loaded.", "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleSubmit() {
    this.notice.setNotice('', '');
    try {
      if (this.editingId()) {
        await firstValueFrom(this.http.put(API_ROUTES.suppliers.byId(this.editingId()), this.form()));
        this.notice.setNotice("Supplier updated.", "");
      } else {
        await firstValueFrom(this.http.post(API_ROUTES.suppliers.root, this.form()));
        this.notice.setNotice("Supplier created.", "");
      }
      this.editingId.set("");
      this.form.set({ ...initialForm });
      await this.loadSuppliers();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  handleEdit(row: any) {
    this.editingId.set(getValue(row, "supplierId", "SupplierId"));
    this.form.set({
      name: getValue(row, "name", "Name"),
      contactPerson: getValue(row, "contactPerson", "ContactPerson"),
      email: getValue(row, "email", "Email"),
      phone: getValue(row, "phone", "Phone"),
      address: getValue(row, "address", "Address"),
      city: getValue(row, "city", "City"),
      country: getValue(row, "country", "Country"),
      taxId: getValue(row, "taxId", "TaxId"),
      paymentTerms: getValue(row, "paymentTerms", "PaymentTerms"),
      leadTimeDays: getValue(row, "leadTimeDays", "LeadTimeDays") || 0,
    });
  }

  async handleDeactivate(id: string) {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.put(API_ROUTES.suppliers.deactivate(id), null));
      this.notice.setNotice("Supplier deactivated.", "");
      await this.loadSuppliers();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleRating() {
    this.notice.setNotice('', '');
    try {
      await firstValueFrom(this.http.put(API_ROUTES.suppliers.rating(this.rating().supplierId, this.rating().value), null));
      this.notice.setNotice("Supplier rating updated.", "");
      this.rating.set({ ...initialRating });
      await this.loadSuppliers();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleRefresh() {
    this.notice.setNotice('', '');
    try {
      const loaded = await this.loadSuppliers();
      if (loaded) {
        this.notice.setNotice("Suppliers refreshed.", "");
      }
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  resetLookup() {
    this.lookupMode.set("name");
    this.lookupValue.set("");
    this.handleRefresh();
  }

  resetForm() {
    this.form.set({ ...initialForm });
  }

  resetRating() {
    this.rating.set({ ...initialRating });
  }

  cancelEdit() {
    this.editingId.set("");
    this.form.set({ ...initialForm });
  }
}
