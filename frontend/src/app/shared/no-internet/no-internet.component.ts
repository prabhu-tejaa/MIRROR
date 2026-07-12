
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-no-internet',
  standalone: true,
  imports: [],
  templateUrl: './no-internet.component.html',
  styleUrls: ['./no-internet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoInternetComponent {
  @Input() public isVisible: boolean = false;
}
