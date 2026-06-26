import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandLogo } from './brand-logo';

@Component({
  selector: 'app-brand',
  imports: [BrandLogo],
  template: `<app-brand-logo [compact]="compact()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brand {
  readonly compact = input(false);
}
