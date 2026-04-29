import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { API_ROUTES, NAV_ITEMS, ROLE_LABELS } from '../../core/constants/app.constants';
import { formatCurrency, getValue, safeArray } from '../../core/utils/utils';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  http = inject(HttpClient);

  user = this.auth.user;

  summary = signal({
    products: 0,
    warehouses: 0,
    users: 0,
    suppliers: 0,
    approvedPos: 0,
    lowStock: 0,
    totalValue: 0,
  });

  loading = signal(true);

  ROLE_LABELS = ROLE_LABELS;
  formatCurrency = formatCurrency;

  get quickLinks() {
    const u = this.user();
    return NAV_ITEMS.filter(
      (item) => item.to !== '/' && item.to !== '/profile' && item.roles.includes(u?.role || '')
    );
  }

  get canViewInventoryValue() {
    const role = this.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  ngOnInit() {
    this.loadDashboard();
  }

  async loadDashboard() {
    this.loading.set(true);
    const u = this.user();
    const role = u?.role;

    const nextSummary = {
      products: 0,
      warehouses: 0,
      users: 0,
      suppliers: 0,
      approvedPos: 0,
      lowStock: 0,
      totalValue: 0,
    };

    try {
      if (['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'].includes(role || '')) {
        const prodRes: any = await firstValueFrom(this.http.get(API_ROUTES.products.root));
        nextSummary.products = safeArray(prodRes).length;

        const whRes: any = await firstValueFrom(this.http.get(API_ROUTES.warehouse.warehouses));
        nextSummary.warehouses = safeArray(whRes).length;

        const lowStockRes: any = await firstValueFrom(this.http.get(API_ROUTES.warehouse.lowStock));
        nextSummary.lowStock = safeArray(lowStockRes).length;
      }

      if (role === 'ADMIN') {
        const userRes: any = await firstValueFrom(this.http.get(API_ROUTES.auth.users));
        nextSummary.users = safeArray(userRes).length;
      }

      if (role === 'OFFICER') {
        const supRes: any = await firstValueFrom(this.http.get(API_ROUTES.suppliers.root));
        nextSummary.suppliers = safeArray(supRes).length;
      }

      if (['ADMIN', 'MANAGER', 'OFFICER'].includes(role || '')) {
        const poRes: any = await firstValueFrom(this.http.get(API_ROUTES.purchaseOrders.byStatus('APPROVED')));
        nextSummary.approvedPos = safeArray(poRes).length;
      }

      if (['ADMIN', 'MANAGER'].includes(role || '')) {
        const valRes: any = await firstValueFrom(this.http.get(API_ROUTES.reports.totalValue));
        nextSummary.totalValue = getValue(valRes, 'totalValue', 'TotalValue') || valRes || 0;
      }
    } catch (error) {
      console.error('Failed to load some dashboard data:', error);
    } finally {
      this.summary.set(nextSummary);
      this.loading.set(false);
    }
  }
}
