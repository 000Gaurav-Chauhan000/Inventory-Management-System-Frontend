import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NoticeService } from '../../../core/services/notice.service';
import { PUBLIC_SIGNUP_ROLES, ROLE_LABELS } from '../../../core/constants/app.constants';
import { KeyValuePipe } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, KeyValuePipe],
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  auth = inject(AuthService);
  router = inject(Router);
  notice = inject(NoticeService);

  PUBLIC_SIGNUP_ROLES = PUBLIC_SIGNUP_ROLES;
  ROLE_LABELS = ROLE_LABELS;

  form = {
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'STAFF',
    department: '',
  };
  
  loading = signal(false);

  async handleSubmit() {
    this.loading.set(true);
    this.notice.setNotice('', '');

    try {
      await this.auth.register(this.form);
      this.notice.setNotice('Account created. You can login now.', '');
      setTimeout(() => this.router.navigate(['/login']), 900);
    } catch (error: any) {
      this.notice.setNotice('', error.message || 'Signup failed');
    } finally {
      this.loading.set(false);
    }
  }
}
