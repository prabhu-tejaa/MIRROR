import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StarfieldService {
  private formHeartSource = new Subject<void>();
  formHeart$ = this.formHeartSource.asObservable();

  private disperseSource = new Subject<void>();
  disperse$ = this.disperseSource.asObservable();

  formHeart() {
    this.formHeartSource.next();
  }

  disperse() {
    this.disperseSource.next();
  }
}
