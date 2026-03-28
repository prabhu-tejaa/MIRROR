import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ExploreContainerComponent } from '../../../../explore-container/explore-container.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, infinite } from 'ionicons/icons';

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonFab,
    IonFabButton,
    IonIcon,
    ExploreContainerComponent,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements OnInit {
  isHeart = false;
  private cdr = inject(ChangeDetectorRef);
  private starfieldSvc = inject(StarfieldService);

  constructor() {
    addIcons({ heart, infinite });
  }
  
  toggleHeart() {
    this.isHeart = !this.isHeart;
    if (this.isHeart) {
      this.starfieldSvc.formHeart();
    } else {
      this.starfieldSvc.disperse();
    }
  }

  async ngOnInit() {
    console.log('Ionic is attempting to shake hands with the Backend...');
    setTimeout(async () => {
       await this.testBackendConnection();
       this.cdr.markForCheck();
    }, 1000);
  }

  async testBackendConnection() {
    try {
      const response = await fetch('http://192.168.1.101:8080/actuator/health', {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MIRЯOЯ Backend says:', data);
    } catch (error) {
      console.error('Handshake failed:', error);
    }
  }
}
