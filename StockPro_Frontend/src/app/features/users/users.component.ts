import { Component, inject, OnInit, signal, ViewChild, TemplateRef, effect, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { API_ROUTES, ROLE_LABELS, ROLES } from '../../core/constants/app.constants';
import { extractApiMessage, formatDate, getValue, safeArray } from '../../core/utils/utils';
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

const formInitial = {
  fullName: "",
  email: "",
  phone: "",
  role: "STAFF",
  department: "",
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, FloatingNoticeComponent],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit, AfterViewInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  notice = inject(NoticeService);

  users = signal<any[]>([]);
  draftForm = signal(getPersistentState('draft:users:createForm', formInitial));
  password = signal("");

  ROLES = ROLES;
  ROLE_LABELS: any = ROLE_LABELS;

  @ViewChild('nameCell') nameCell!: TemplateRef<any>;
  @ViewChild('roleCell') roleCell!: TemplateRef<any>;
  @ViewChild('departmentCell') departmentCell!: TemplateRef<any>;
  @ViewChild('statusCell') statusCell!: TemplateRef<any>;
  @ViewChild('createdCell') createdCell!: TemplateRef<any>;
  @ViewChild('actionsCell') actionsCell!: TemplateRef<any>;

  columns: Column[] = [];

  getValue = getValue;
  formatDate = formatDate;
  Object = Object;

  constructor() {
    effect(() => setPersistentState('draft:users:createForm', this.draftForm()));
  }

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.columns = [
        { label: "Name", key: '', render: this.nameCell },
        { label: "Role", key: '', render: this.roleCell },
        { label: "Department", key: '', render: this.departmentCell },
        { label: "Status", key: '', render: this.statusCell },
        { label: "Created", key: '', render: this.createdCell },
        { label: "Actions", key: '', render: this.actionsCell },
      ];
    });
  }

  async loadUsers() {
    try {
      const response: any = await firstValueFrom(this.http.get(API_ROUTES.auth.users));
      this.users.set(safeArray(response));
      return true;
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
      return false;
    }
  }

  async handleCreate() {
    this.notice.setNotice('', '');
    try {
      await this.auth.createUser({
        ...this.draftForm(),
        password: this.password()
      });
      this.draftForm.set({ ...formInitial });
      this.password.set("");
      this.notice.setNotice("User created successfully.", "");
      await this.loadUsers();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }

  async handleDeactivate(row: any) {
    this.notice.setNotice('', '');
    const userId = getValue(row, 'userId', 'UserId');
    try {
      await firstValueFrom(this.http.put(API_ROUTES.auth.deactivate(userId), null));
      this.notice.setNotice("User deactivated.", "");
      await this.loadUsers();
    } catch (e: any) {
      this.notice.setNotice("", extractApiMessage(e));
    }
  }
}
