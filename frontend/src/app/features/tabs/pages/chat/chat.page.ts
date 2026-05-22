import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../../../../explore-container/explore-container.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.page.html',
  styleUrls: ['chat.page.scss'],
  standalone: true,
  imports: [IonContent, ExploreContainerComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPage {
}
