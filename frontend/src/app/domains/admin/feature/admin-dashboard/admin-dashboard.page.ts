import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, arrowBackOutline, peopleOutline, peopleCircleOutline, serverOutline, pulseOutline, lockClosedOutline } from 'ionicons/icons';

import { PresenceService } from '../../../../core/services/presence.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class AdminDashboardPage {
  private navCtrl: NavController = inject(NavController);
  private presenceService: PresenceService = inject(PresenceService);

  public onlineUsersCount$: import('rxjs').Observable<number> = this.presenceService.onlineUsersCount$;

  constructor() {
    addIcons({ shieldCheckmarkOutline, arrowBackOutline, peopleOutline, peopleCircleOutline, serverOutline, pulseOutline, lockClosedOutline });
  }

  public goBack(): void {
    void this.navCtrl.navigateRoot('/tabs/profile', { animated: false });
  }

  public navigateTo(path: string): void {
    void this.navCtrl.navigateForward(path);
  }
}
