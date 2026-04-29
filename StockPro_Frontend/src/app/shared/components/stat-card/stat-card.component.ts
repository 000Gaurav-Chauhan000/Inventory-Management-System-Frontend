import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.component.html'
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() helper = '';
  @Input() tone: 'default' | 'coral' | 'mint' | 'ink' = 'default';
  
  get containerClasses() {
    const base = 'panel-soft p-5';
    switch (this.tone) {
      case 'coral': return `${base} bg-coral text-white`;
      case 'mint': return `${base} bg-mint/30`;
      case 'ink': return `${base} bg-ink-950 text-white`;
      default: return `${base} bg-white`;
    }
  }
}
