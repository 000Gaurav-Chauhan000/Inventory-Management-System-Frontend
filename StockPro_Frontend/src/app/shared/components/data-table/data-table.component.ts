import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Column {
  label: string;
  key: string;
  render?: TemplateRef<any>;
  renderFn?: (row: any) => string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html'
})
export class DataTableComponent {
  @Input() columns: Column[] = [];
  @Input() rows: any[] = [];
  @Input() emptyMessage = "No records found.";
}
