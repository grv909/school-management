import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'danger' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this._toasts.asReadonly();

  show(message: string, kind: ToastKind = 'info', durationMs = 3000): void {
    const id = this.nextId++;
    this._toasts.update(arr => [...arr, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string)   { this.show(message, 'danger', 4500); }
  warn(message: string)    { this.show(message, 'warning'); }

  dismiss(id: number): void {
    this._toasts.update(arr => arr.filter(t => t.id !== id));
  }
}
