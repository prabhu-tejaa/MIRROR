import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type ShapeType = 'none' | 'heart' | 'circle' | 'star' | 'square' | 'smiley';

@Injectable({
  providedIn: 'root'
})
export class StarfieldService {
  private readonly shapeSource: Subject<ShapeType> = new Subject<ShapeType>();
  public readonly shape$: Observable<ShapeType> = this.shapeSource.asObservable();

  public setShape(type: ShapeType): void {
    this.shapeSource.next(type);
  }

  public disperse(): void {
    this.shapeSource.next('none');
  }
}
