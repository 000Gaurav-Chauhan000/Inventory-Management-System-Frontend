import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NAV_ITEMS, ROLE_LABELS } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  auth = inject(AuthService);
  
  user = this.auth.user;
  
  allowedItems = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role));
  });

  ROLE_LABELS = ROLE_LABELS;

  logout() {
    this.auth.logout();
  }
}
