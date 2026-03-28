import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonIcon 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ExploreContainerComponent } from '../../../../explore-container/explore-container.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

import { StarfieldService, ShapeType } from '../../../../shared/starfield/starfield.service';
import { addIcons } from 'ionicons';
import { heart, infinite, star, ellipseOutline, squareOutline, happyOutline } from 'ionicons/icons';

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
    IonIcon,
    ExploreContainerComponent,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements OnInit {
  currentShape: ShapeType = 'none';
  private cdr = inject(ChangeDetectorRef);
  private starfieldSvc = inject(StarfieldService);

  constructor() {
    addIcons({ heart, infinite, star, ellipseOutline, squareOutline, happyOutline });
  }
  
  setShape(type: ShapeType) {
    if (this.currentShape === type) {
      this.currentShape = 'none';
    } else {
      this.currentShape = type;
    }
    this.starfieldSvc.setShape(this.currentShape);
    this.cdr.markForCheck();
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
