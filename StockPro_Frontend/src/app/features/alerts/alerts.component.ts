import { Component, inject, signal, ViewChild, TemplateRef, effect, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES } from '../../core/constants/app.constants';
import { extractApiMessage, formatDate, getValue, isGuid, isPositiveInteger } from '../../core/utils/utils';
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

const createInitial = {
  recipientId: "",
  type: "LOW_STOCK",
  severity: "WARNING",
  title: "",
  message: "",
  relatedProductId: "",
  relatedWarehouseId: "",
  channel: "IN_APP",
};

const ALERT_LOAD_OPTIONS = [
  { value: "list", label: "All recipient alerts", actionLabel: "Load alerts" },
  { value: "unread", label: "Unread count", actionLabel: "Load unread count" },
  { value: "unacknowledged", label: "Unacknowledged alerts", actionLabel: "Load unacknowledged" },
  { value: "readAll", label: "Mark all as read", actionLabel: "Mark all read" },
];

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './alerts.component.html'
})
export class AlertsComponent implements AfterViewInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  loadMode = signal(getPersistentState('draft:alerts:loadMode', "list"));
  recipientId = signal(getPersistentState('draft:alerts:recipientId', ""));
  alerts = signal<any[]>([]);
  unreadCount = signal("");
  form = signal(getPersistentState('draft:alerts:form', createInitial));
  bulkRecipients = signal(getPersistentState('draft:alerts:bulkRecipients', ""));

  ALERT_LOAD_OPTIONS = ALERT_LOAD_OPTIONS;

  @ViewChild('alertCell') alertCell!: TemplateRef<any>;
  @ViewChild('recipientCell') recipientCell!: TemplateRef<any>;
  @ViewChild('typeCell') typeCell!: TemplateRef<any>;
  @ViewChild('severityCell') severityCell!: TemplateRef<any>;
  @ViewChild('createdCell') createdCell!: TemplateRef<any>;
  @ViewChild('actionsCell') actionsCell!: TemplateRef<any>;

  columns: Column[] = [];

  getValue = getValue;
  formatDate = formatDate;
  Object = Object;

  constructor() {
    effect(() => setPersistentState('draft:alerts:loadMode', this.loadMode()));
    effect(() => setPersistentState('draft:alerts:recipientId', this.recipientId()));
    effect(() => setPersistentState('draft:alerts:form', this.form()));
    effect(() => setPersistentState('draft:alerts:bulkRecipients', this.bulkRecipients()));
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.columns = [
        { label: "Alert", key: '', render: this.alertCell },
        { label: "Recipient", key: '', render: this.recipientCell },
        { label: "Type", key: '', render: this.typeCell },
        { label: "Severity", key: '', render: this.severityCell },
        { label: "Created", key: '', render: this.createdCell },
        { label: "Actions", key: '', render: this.actionsCell },
      ];
    });
  }

  get selectedLoadOption() {
    return ALERT_LOAD_OPTIONS.find((option) => option.value === this.loadMode()) || ALERT_LOAD_OPTIONS[0];
  }

  async loadAlerts(path: string, successMessage: string) {
    this.notice.setNotice('', '');
    try {
      const response: any = await firstValueFrom(this.http.get(path));
      if (Array.isArray(response)) {
        this.alerts.set(response);
        this.unreadCount.set("");
      } else {
        this.alerts.set([]);
        this.unreadCount.set(String(response));
      }
      if (successMessage) {
        this.notice.setNotice(successMessage, "");
      }
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleCreate() {
    this.notice.setNotice('', '');
    const form = this.form();
    try {
      if (!isPositiveInteger(form.recipientId)) {
        this.notice.setNotice("", "Enter a valid numeric recipient ID.");
        return;
      }
      if (form.relatedProductId && !isGuid(form.relatedProductId)) {
        this.notice.setNotice("", "Related product ID must be a valid GUID.");
        return;
      }
      if (form.relatedWarehouseId && !isPositiveInteger(form.relatedWarehouseId)) {
        this.notice.setNotice("", "Related warehouse ID must be numeric.");
        return;
      }

      await firstValueFrom(this.http.post(API_ROUTES.alerts.root, {
        recipientId: Number(form.recipientId),
        type: form.type,
        severity: form.severity,
        title: form.title,
        message: form.message,
        relatedProductId: form.relatedProductId || null,
        relatedWarehouseId: form.relatedWarehouseId ? Number(form.relatedWarehouseId) : null,
        channel: form.channel,
      }));

      this.notice.setNotice("Alert created.", "");
      this.form.set({ ...createInitial });
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleBulkCreate() {
    this.notice.setNotice('', '');
    const form = this.form();
    try {
      const recipients = [
        ...new Set(
          this.bulkRecipients()
            .split(/[\s,]+/)
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0)
        ),
      ];

      if (!recipients.length) {
        this.notice.setNotice("", "Enter one or more recipient IDs separated by commas or spaces.");
        return;
      }

      await firstValueFrom(this.http.post(API_ROUTES.alerts.bulk, recipients.map((id) => ({
        recipientId: Number(id),
        type: form.type,
        severity: form.severity,
        title: form.title,
        message: form.message,
        relatedProductId: form.relatedProductId || null,
        relatedWarehouseId: form.relatedWarehouseId ? Number(form.relatedWarehouseId) : null,
        channel: form.channel,
      }))));

      this.notice.setNotice("Bulk alerts sent.", "");
      this.bulkRecipients.set("");
      this.form.set({ ...createInitial });
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async runAction(factory: () => Promise<any>, successMessage: string) {
    this.notice.setNotice('', '');
    try {
      await factory();
      this.notice.setNotice(successMessage, "");
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  handleLoadAlerts() {
    const rId = this.recipientId();
    if (!isPositiveInteger(rId)) {
      this.notice.setNotice("", "Enter a valid numeric recipient ID.");
      return;
    }

    switch (this.loadMode()) {
      case "list":
        this.loadAlerts(API_ROUTES.alerts.byRecipient(rId), "Alerts loaded.");
        return;
      case "unread":
        this.loadAlerts(API_ROUTES.alerts.unread(rId), "Unread alert count loaded.");
        return;
      case "unacknowledged":
        this.loadAlerts(API_ROUTES.alerts.unacknowledged(rId), "Unacknowledged alerts loaded.");
        return;
      case "readAll":
        this.runAction(
          () => firstValueFrom(this.http.post(API_ROUTES.alerts.readAll(rId), null)),
          "All recipient alerts marked as read."
        );
        return;
      default:
        this.notice.setNotice("", "Choose how you want to load alerts.");
    }
  }

  handleMarkRead(row: any) {
    const alertId = getValue(row, 'alertId', 'AlertId');
    this.runAction(() => firstValueFrom(this.http.post(API_ROUTES.alerts.markRead(alertId), null)), 'Alert marked as read.');
  }

  handleAcknowledge(row: any) {
    const alertId = getValue(row, 'alertId', 'AlertId');
    this.runAction(() => firstValueFrom(this.http.post(API_ROUTES.alerts.acknowledge(alertId), null)), 'Alert acknowledged.');
  }

  handleDelete(row: any) {
    const alertId = getValue(row, 'alertId', 'AlertId');
    this.runAction(() => firstValueFrom(this.http.delete(API_ROUTES.alerts.remove(alertId))), 'Alert deleted.');
  }
}
