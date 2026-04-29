import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoticeService } from '../../../core/services/notice.service';

@Component({
  selector: 'app-floating-notice',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-notice.component.html',
  styleUrl: './floating-notice.component.css'
})
export class FloatingNoticeComponent {
  noticeService = inject(NoticeService);
  
  message = this.noticeService.message;
  error = this.noticeService.error;
  
  visibleMessage = '';
  visibleError = '';
  
  constructor() {
    effect(() => {
      const msg = this.message();
      if (msg) {
        this.visibleMessage = msg;
        setTimeout(() => this.noticeService.setNotice('', this.error()), 3200);
      } else {
        this.visibleMessage = '';
      }
    }, { allowSignalWrites: true });
    
    effect(() => {
      const err = this.error();
      if (err) {
        this.visibleError = err;
        setTimeout(() => this.noticeService.setNotice(this.message(), ''), 4200);
      } else {
        this.visibleError = '';
      }
    }, { allowSignalWrites: true });
  }
}
