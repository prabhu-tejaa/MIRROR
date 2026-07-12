import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart, Event } from '@angular/router';
import { Subject, Observable, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpCancelService {
  private router: Router = inject(Router);
  
  private cancelPendingRequestsSubject: Subject<void> = new Subject<void>();
  public cancelPendingRequests$: Observable<void> = this.cancelPendingRequestsSubject.asObservable();

  constructor() {
    this.router.events.pipe(
      filter((event: Event) => event instanceof NavigationStart)
    ).subscribe(() => {
      this.cancelPendingRequests();
    });
  }

  public cancelPendingRequests(): void {
    this.cancelPendingRequestsSubject.next();
  }
}
