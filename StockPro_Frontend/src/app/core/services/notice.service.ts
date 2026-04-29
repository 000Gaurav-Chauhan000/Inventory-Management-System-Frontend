import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NoticeService {
  message = signal<string>('');
  error = signal<string>('');

  setNotice(nextMessage = '', nextError = ''): void {
    this.message.set(nextMessage);
    this.error.set(nextError);
  }

  clearNotice(): void {
    this.message.set('');
    this.error.set('');
  }
}
