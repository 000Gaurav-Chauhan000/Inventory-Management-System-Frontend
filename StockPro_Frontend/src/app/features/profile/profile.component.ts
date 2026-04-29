import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NoticeService } from '../../core/services/notice.service';
import { formatDate } from '../../core/utils/utils';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FloatingNoticeComponent } from '../../shared/components/floating-notice/floating-notice.component';

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

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, FloatingNoticeComponent],
  templateUrl: './profile.component.html'
})
export class ProfileComponent {
  auth = inject(AuthService);
  notice = inject(NoticeService);

  user = this.auth.user;
  
  profileForm = signal(getPersistentState('draft:profile:form', {
    fullName: this.user()?.fullName || "",
    phone: this.user()?.phone || "",
    department: this.user()?.department || "",
  }));

  passwordForm = signal({
    oldPassword: "",
    newPassword: "",
  });

  formatDate = formatDate;
  Object = Object;

  constructor() {
    effect(() => setPersistentState('draft:profile:form', this.profileForm()));
  }

  async handleProfileSubmit() {
    this.notice.setNotice('', '');
    try {
      const nextUser = await this.auth.updateProfile(this.profileForm());
      if (nextUser) {
        this.profileForm.set({
          fullName: nextUser.fullName || "",
          phone: nextUser.phone || "",
          department: nextUser.department || "",
        });
      }
      this.notice.setNotice("Profile updated successfully.", "");
    } catch (e: any) {
      this.notice.setNotice("", e.message);
    }
  }

  async handlePasswordSubmit() {
    this.notice.setNotice('', '');
    try {
      await this.auth.changePassword(this.passwordForm());
      this.notice.setNotice("Password changed successfully. You will be logged out in 2 seconds...", "");
      this.passwordForm.set({ oldPassword: "", newPassword: "" });
      
      setTimeout(() => {
        this.auth.logout();
      }, 2000);
    } catch (e: any) {
      this.notice.setNotice("", e.message);
    }
  }

  async handleSessionRefresh() {
    this.notice.setNotice('', '');
    try {
      await this.auth.refreshSession();
      this.notice.setNotice("Session token refreshed successfully.", "");
    } catch (e: any) {
      this.notice.setNotice("", e.message);
    }
  }
}
