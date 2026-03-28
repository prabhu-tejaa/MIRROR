import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ShapeType = 'none' | 'heart' | 'circle' | 'star' | 'square' | 'smiley';

@Injectable({
  providedIn: 'root'
})
export class StarfieldService {
  private shapeSource = new Subject<ShapeType>();
  shape$ = this.shapeSource.asObservable();

  setShape(type: ShapeType) {
    this.shapeSource.next(type);
  }

  disperse() {
    this.shapeSource.next('none');
  }
}
