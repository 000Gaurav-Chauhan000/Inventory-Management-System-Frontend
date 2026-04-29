import { Component, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES } from '../../core/constants/app.constants';
import { downloadBlob, extractApiMessage, formatCurrency, isPositiveInteger, titleCase } from '../../core/utils/utils';
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

const REPORT_ACTIONS = [
  { value: "totalValue", label: "Total value", resultLabel: "Total stock value", roles: ["ADMIN", "MANAGER"] },
  { value: "byWarehouse", label: "By warehouse", resultLabel: "Stock value by warehouse", roles: ["ADMIN", "MANAGER"], requires: ["warehouseId"] },
  { value: "turnover", label: "Turnover", resultLabel: "Inventory turnover", roles: ["ADMIN", "MANAGER"], requires: ["dateRange"] },
  { value: "lowStock", label: "Low stock", resultLabel: "Low stock report", roles: ["MANAGER"] },
  { value: "topMoving", label: "Top moving", resultLabel: "Top moving products", roles: ["ADMIN", "MANAGER"] },
  { value: "slowMoving", label: "Slow moving", resultLabel: "Slow moving products", roles: ["MANAGER"] },
  { value: "deadStock", label: "Dead stock", resultLabel: "Dead stock", roles: ["ADMIN", "MANAGER"] },
  { value: "poSummary", label: "PO summary", resultLabel: "PO summary", roles: ["ADMIN", "MANAGER"] },
];

function renderObjectRows(source: any) {
  return Object.entries(source || {}).map(([key, value]) => ({
    key,
    label: titleCase(key),
    value: typeof value === "number" ? formatCurrency(value) : String(value),
  }));
}

function formatReportValue(value: any, label = "") {
  if (typeof value === "number") {
    return /value|amount|cost|summary/i.test(label) ? formatCurrency(value) : String(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value ?? "-");
}

async function extractReportDownloadError(error: any) {
  const data = error?.error;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      if (!text) return error?.message || "Something went wrong. Please try again.";
      const parsed = JSON.parse(text);
      return parsed?.message || parsed?.error || text;
    } catch {
      return error?.message || "Something went wrong. Please try again.";
    }
  }
  return extractApiMessage(error);
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './reports.component.html'
})
export class ReportsComponent {
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  user = this.auth.user;
  Object = Object;
  rows = signal<any[]>([]);
  single = signal<any[]>([]);
  context = signal("Run a report to view analytics.");
  activeReport = signal(getPersistentState('draft:reports:activeReport', "totalValue"));
  filters = signal(getPersistentState('draft:reports:filters', { warehouseId: "", start: "", end: "" }));

  constructor() {
    effect(() => setPersistentState('draft:reports:activeReport', this.activeReport()));
    effect(() => setPersistentState('draft:reports:filters', this.filters()));
  }

  get availableReports() {
    return REPORT_ACTIONS.filter((action) => action.roles.includes(this.user()?.role || ''));
  }

  get selectedReport() {
    return this.availableReports.find((action) => action.value === this.activeReport()) || this.availableReports[0];
  }

  get dynamicColumns(): Column[] {
    const r = this.rows();
    if (r.length > 0) {
      const keys = Object.keys(r[0] || {});
      return keys.map((key) => ({
        label: titleCase(key),
        key: '',
        renderFn: (row: any) => {
          const value = row[key];
          return typeof value === "object" ? JSON.stringify(value) : String(value ?? "-");
        }
      }));
    }
    return [
      { label: "Metric", key: '', renderFn: (row: any) => row.label },
      { label: "Value", key: '', renderFn: (row: any) => row.value },
    ];
  }

  async runReport(label: string, factory: () => Promise<any>) {
    this.notice.setNotice('', '');
    try {
      const payload = await factory();
      this.context.set(label);
      if (Array.isArray(payload)) {
        if (payload.some((item) => item && typeof item === "object")) {
          this.rows.set(payload);
          this.single.set([]);
        } else {
          this.rows.set(payload.map((item, index) => ({ item: index + 1, value: formatReportValue(item, label) })));
          this.single.set([]);
        }
        this.notice.setNotice(`${label} loaded.`, "");
        return;
      }
      this.rows.set([]);
      this.single.set(
        payload && typeof payload === "object"
          ? renderObjectRows(payload)
          : [{ label, value: formatReportValue(payload, label) }]
      );
      this.notice.setNotice(`${label} loaded.`, "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async generateReportFile() {
    this.notice.setNotice('', '');
    try {
      const response: Blob = await firstValueFrom(this.http.get(API_ROUTES.reports.generate, { responseType: "blob" }));
      downloadBlob(response, "stockpro-report.txt", "application/octet-stream");
      this.notice.setNotice("Inventory report downloaded.", "");
    } catch (e: any) {
      this.notice.setNotice("", await extractReportDownloadError(e));
    }
  }

  async handleRunReport() {
    if (!this.selectedReport) {
      this.notice.setNotice("", "Choose a report first.");
      return;
    }
    const f = this.filters();
    if (this.selectedReport.requires?.includes("warehouseId") && !isPositiveInteger(f.warehouseId)) {
      this.notice.setNotice("", "Enter a valid numeric warehouse ID before running this report.");
      return;
    }
    if (this.selectedReport.requires?.includes("dateRange") && (!f.start || !f.end)) {
      this.notice.setNotice("", "Select both start and end dates before running the turnover report.");
      return;
    }

    const factories: Record<string, () => Promise<any>> = {
      totalValue: () => firstValueFrom(this.http.get(API_ROUTES.reports.totalValue)),
      byWarehouse: () => firstValueFrom(this.http.get(API_ROUTES.reports.byWarehouse(f.warehouseId))),
      turnover: () => firstValueFrom(this.http.get(API_ROUTES.reports.turnover(f.start, f.end))),
      lowStock: () => firstValueFrom(this.http.get(API_ROUTES.reports.lowStock)),
      topMoving: () => firstValueFrom(this.http.get(API_ROUTES.reports.topMoving)),
      slowMoving: () => firstValueFrom(this.http.get(API_ROUTES.reports.slowMoving)),
      deadStock: () => firstValueFrom(this.http.get(API_ROUTES.reports.deadStock)),
      poSummary: () => firstValueFrom(this.http.get(API_ROUTES.reports.poSummary)),
    };

    await this.runReport(this.selectedReport.resultLabel, factories[this.selectedReport.value]);
  }
}
