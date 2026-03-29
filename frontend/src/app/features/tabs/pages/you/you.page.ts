import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonIcon,
  IonLabel 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ExploreContainerComponent } from '../../../../explore-container/explore-container.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

import { StarfieldService, ShapeType } from '../../../../shared/starfield/starfield.service';
import { addIcons } from 'ionicons';
import { heart, infinite, star, ellipseOutline, squareOutline, happyOutline } from 'ionicons/icons';
import { environment } from '../../../../../environments/environment';

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
    IonLabel,
    ExploreContainerComponent,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private starfieldSvc = inject(StarfieldService);

  public currentShape: ShapeType = 'none';

  public readonly heart = heart;
  public readonly infinite = infinite;
  public readonly star = star;
  public readonly ellipseOutline = ellipseOutline;
  public readonly squareOutline = squareOutline;
  public readonly happyOutline = happyOutline;

  constructor() {
    addIcons({ heart, infinite, star, ellipseOutline, squareOutline, happyOutline });
  }
  
  public setShape(type: ShapeType): void {
    if (this.currentShape === type) {
      this.currentShape = 'none';
    } else {
      this.currentShape = type;
    }
    this.starfieldSvc.setShape(this.currentShape);
    this.cdr.markForCheck();
  }

  public async ngOnInit(): Promise<void> {
    setTimeout(async (): Promise<void> => {
       await this.testBackendConnection();
       this.cdr.markForCheck();
    }, 1000);
  }

  private async testBackendConnection(): Promise<void> {
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

      const data = await response.json() as Record<string, unknown>;
      if (!environment.production) {
        // eslint-disable-next-line no-console
        console.log('Backend Handshake Success:', data);
      }
    } catch {
      if (!environment.production) {
        // Silent or development-only error handling
      }
    }
  }
}
