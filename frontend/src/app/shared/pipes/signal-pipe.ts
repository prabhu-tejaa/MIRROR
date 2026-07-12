import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'signal'
})
export class SignalPipe implements PipeTransform {
  public transform(_value: unknown, ..._args: unknown[]): unknown {
    return null;
  }
}
