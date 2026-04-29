import { Routes } from '@angular/router';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';
import { authGuard } from './core/services/auth.guard';
import { publicGuard } from './core/services/public.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent),
    canActivate: [publicGuard]
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
        data: { roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] }
      },
      {
        path: 'warehouses',
        loadComponent: () => import('./features/warehouses/warehouses.component').then(m => m.WarehousesComponent),
        data: { roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] }
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent),
        data: { roles: ['OFFICER'] }
      },
      {
        path: 'purchase-orders',
        loadComponent: () => import('./features/purchase-orders/purchase-orders.component').then(m => m.PurchaseOrdersComponent),
        data: { roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] }
      },
      {
        path: 'movements',
        loadComponent: () => import('./features/movements/movements.component').then(m => m.MovementsComponent),
        data: { roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] }
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts.component').then(m => m.AlertsComponent),
        data: { roles: ['ADMIN', 'MANAGER', 'OFFICER', 'STAFF'] }
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        data: { roles: ['ADMIN', 'MANAGER'] }
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
        data: { roles: ['ADMIN'] }
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
