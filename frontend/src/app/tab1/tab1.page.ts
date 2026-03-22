import { Component, OnInit } from '@angular/core';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    ExploreContainerComponent
  ],
})
export class Tab1Page implements OnInit {
  constructor() {}

  async ngOnInit() {
    console.log('Ionic is attempting to shake hands with the Backend...');
    setTimeout(async () => {
       await this.testBackendConnection();
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