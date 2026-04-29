import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NoticeService } from '../../../core/services/notice.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  auth = inject(AuthService);
  router = inject(Router);
  notice = inject(NoticeService);

  form = { email: '', password: '' };
  loading = signal(false);

  async handleSubmit() {
    this.loading.set(true);
    this.notice.setNotice('', '');

    try {
      await this.auth.login(this.form);
      this.router.navigate(['/']);
    } catch (error: any) {
      this.notice.setNotice('', error.message || 'Login failed');
    } finally {
      this.loading.set(false);
    }
  }
}
