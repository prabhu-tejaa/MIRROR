import { 
  Component, 
  Input, 
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { wifiOutline } from 'ionicons/icons';

@Component({
  selector: 'app-no-internet',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './no-internet.component.html',
  styleUrls: ['./no-internet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoInternetComponent {
  @Input() isVisible: boolean = false;

  constructor() {
    addIcons({ 'wifi-outline': wifiOutline });
  }
}
