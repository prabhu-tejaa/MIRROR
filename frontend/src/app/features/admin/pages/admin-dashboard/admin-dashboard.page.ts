import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { PresenceService } from '../../../../core/services/presence.service';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, arrowBackOutline, peopleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class AdminDashboardPage {
  private navCtrl = inject(NavController);
  private presenceService = inject(PresenceService);

  public onlineUsersCount$ = this.presenceService.onlineUsersCount$;

  constructor() {
    addIcons({ shieldCheckmarkOutline, arrowBackOutline, peopleOutline });
  }

  public goBack(): void {
    this.navCtrl.navigateRoot('/tabs/profile', { animated: false });
  }
}
