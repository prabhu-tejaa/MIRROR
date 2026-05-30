import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart } from 'ionicons/icons';

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage {
  constructor() {
    addIcons({ heart });
  }
}
