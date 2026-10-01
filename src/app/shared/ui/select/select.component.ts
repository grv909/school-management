import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, Signal,
  ViewChild, computed, forwardRef, inject, signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface SelectOption<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
}

// Shared across every admin/teacher gender <app-select> (previously duplicated
// as static <option> markup in students-page and teacher-students templates).
export const GENDER_OPTIONS: SelectOption<string>[] = [
  { value: '', label: '—' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' }
];

export const GENDER_OPTIONS_WITH_OTHER: SelectOption<string>[] = [
  ...GENDER_OPTIONS,
  { value: 'O', label: 'Other' }
];

/**
 * Custom dropdown replacing the native <select> everywhere in the app. A native
 * select's CLOSED state can be restyled with CSS (border, chevron, etc. — see
 * _form.scss), but its OPEN popup is drawn entirely by the OS/browser (a dark,
 * checkmark-style native menu on macOS in particular) and cannot be themed by
 * any CSS — the only way to control the open-state design is to stop using the
 * native popup and draw our own.
 *
 * Mobile-first: below $bp-sm the option list renders as a full-width bottom
 * sheet (large tap targets, easy one-thumb reach) instead of a small anchored
 * popover, which is fiddly to use accurately on a touchscreen; at $bp-sm and
 * above it switches to a standard anchored popover under the trigger.
 *
 * Implements ControlValueAccessor so it drops into existing [(ngModel)]/formControl
 * bindings exactly like the native <select> it replaces.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectComponent),
    multi: true
  }],
  template: `
    <div class="select" [class.select--open]="open()">
      <button
        type="button"
        class="select__trigger"
        [class.select__trigger--invalid]="invalid"
        [disabled]="disabled"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-expanded]="open()"
        (click)="toggle()">
        <span class="select__value" [class.select__value--placeholder]="!selectedOption()">
          {{ selectedOption()?.label ?? placeholder }}
        </span>
        <lucide-angular name="chevron-down" [size]="18" class="select__chevron" aria-hidden="true"></lucide-angular>
      </button>

      @if (open()) {
        <!-- Mobile: full-screen backdrop behind the bottom sheet. Desktop: CSS hides this (see _select.scss). -->
        <div class="select__backdrop" (click)="close()"></div>
        <ul class="select__popover" role="listbox" [attr.aria-label]="placeholder" #popover>
          @for (opt of options; track opt.value) {
            <li role="option"
                class="select__option"
                [class.select__option--selected]="isSelected(opt.value)"
                [class.select__option--disabled]="opt.disabled"
                [attr.aria-selected]="isSelected(opt.value)"
                (click)="selectOption(opt)">
              <span>{{ opt.label }}</span>
              @if (isSelected(opt.value)) {
                <lucide-angular name="check" [size]="16" class="select__check" aria-hidden="true"></lucide-angular>
              }
            </li>
          }
        </ul>
      }
    </div>
  `
})
export class SelectComponent<T = unknown> implements ControlValueAccessor {
  // A plain class field read inside computed() isn't tracked as a reactive
  // dependency — when `options` arrives asynchronously (e.g. a class list
  // loaded after the initial selection was set), selectedOption's computed
  // never re-ran because nothing signal-based had changed. Routing the input
  // through a signal makes `options` itself a tracked dependency.
  @Input({ required: true })
  set options(value: SelectOption<T>[]) {
    this._options.set(value);
  }
  get options(): SelectOption<T>[] {
    return this._options();
  }
  private readonly _options = signal<SelectOption<T>[]>([]);

  @Input() placeholder = 'Select';
  @Input() invalid = false;

  // Plain template binding, e.g. [disabled]="!selectedClassId()" — distinct from
  // the ControlValueAccessor's setDisabledState (only invoked by Angular forms
  // when a FormControl itself is disabled, which none of this app's ngModel-only
  // usages do). Both paths feed the same internal `disabled` signal.
  @Input()
  set disabled(value: boolean) {
    this._disabled.set(value);
  }
  get disabled(): boolean {
    return this._disabled();
  }

  @ViewChild('popover') private readonly popoverRef?: ElementRef<HTMLElement>;
  private readonly hostRef = inject(ElementRef);

  readonly open = signal(false);
  private readonly _disabled = signal(false);
  private readonly value = signal<T | null>(null);

  readonly selectedOption: Signal<SelectOption<T> | undefined> = computed(() =>
    this._options().find(o => o.value === this.value())
  );

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  toggle(): void {
    if (this._disabled()) return;
    this.open.update(o => !o);
  }

  close(): void {
    this.open.set(false);
    this.onTouched();
  }

  isSelected(value: T): boolean {
    return this.value() === value;
  }

  selectOption(opt: SelectOption<T>): void {
    if (opt.disabled) return;
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.hostRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  // ControlValueAccessor
  writeValue(value: T | null): void {
    this.value.set(value);
  }
  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }
}
