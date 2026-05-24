import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Subject, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpCancelService {
  private router = inject(Router);
  
  private cancelPendingRequestsSubject = new Subject<void>();
  public cancelPendingRequests$ = this.cancelPendingRequestsSubject.asObservable();

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.cancelPendingRequests();
    });
  }

  public cancelPendingRequests(): void {
    this.cancelPendingRequestsSubject.next();
  }
}
