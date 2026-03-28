import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-no-internet',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './no-internet.component.html',
  styleUrls: ['./no-internet.component.scss'],
})
export class NoInternetComponent implements OnInit {
  @Input() isVisible: boolean = false;

  constructor() { }

  ngOnInit() { }
}
