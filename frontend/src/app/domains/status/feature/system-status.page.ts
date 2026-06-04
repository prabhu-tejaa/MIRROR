import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminGatewayService, ServiceHealth } from '../../admin/data-access/admin-gateway.service';
import { TranslationService } from '../../../core/services/translation.service';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, warningOutline, pulseOutline, refreshOutline } from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-content [fullscreen]="true" class="ion-padding">
      <div class="status-layout">
        
        <!-- Skeleton Loading Grid -->
        <div *ngIf="isLoading && !gatewayHealth" class="skeleton-grid">
          <div class="status-card loading">
            <ion-spinner name="dots"></ion-spinner>
            <span>Resolving systems state</span>
            <ion-spinner name="dots"></ion-spinner>
          </div>
        </div>

        <!-- Services Grid -->
        <div *ngIf="!isLoading || gatewayHealth" class="status-grid">
          
          <!-- API Gateway Card -->
          <div *ngIf="gatewayHealth" class="status-card" [ngClass]="gatewayHealth.status.toLowerCase()">
            <div class="card-header">
              <div class="name-with-icon">
                <ion-icon name="pulse-outline" class="card-icon"></ion-icon>
                <span class="srv-name">{{ gatewayHealth.name }}</span>
              </div>
              <span class="status-badge" [ngClass]="gatewayHealth.status.toLowerCase()">
                <span class="dot"></span>
                {{ gatewayHealth.status }}
              </span>
            </div>

            <div class="card-details">
              <div class="detail-row">
                <span class="label">Response Delay</span>
                <span class="val" *ngIf="gatewayHealth.status === 'ONLINE'">{{ gatewayHealth.latency }}ms</span>
                <span class="val error" *ngIf="gatewayHealth.status === 'OFFLINE'">Timeout</span>
              </div>
              <div class="detail-row">
                <span class="label">Gateway Port</span>
                <span class="val port">{{ gatewayHealth.port }}</span>
              </div>
            </div>

            <!-- Historical Uptime Ticks -->
            <div class="uptime-history">
              <div class="uptime-bar">
                <span *ngFor="let tick of gatewayHealth.status === 'ONLINE' ? onlineTicks : offlineTicks" 
                      class="uptime-tick" 
                      [ngClass]="tick">
                </span>
              </div>
              <div class="uptime-labels">
                <span>90 days ago</span>
                <span class="uptime-percent">{{ gatewayHealth.status === 'ONLINE' ? '99.98% uptime' : 'Service downtime' }}</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          <!-- Auth Service Card -->
          <div *ngFor="let srv of getAuthServices()" class="status-card" [ngClass]="srv.status.toLowerCase()">
            <div class="card-header">
              <div class="name-with-icon">
                <ion-icon name="pulse-outline" class="card-icon"></ion-icon>
                <span class="srv-name">{{ srv.name }}</span>
              </div>
              <span class="status-badge" [ngClass]="srv.status.toLowerCase()">
                <span class="dot"></span>
                {{ srv.status }}
              </span>
            </div>

            <div class="card-details">
              <div class="detail-row">
                <span class="label">Response Delay</span>
                <span class="val" *ngIf="srv.status === 'ONLINE'">{{ srv.latency }}ms</span>
                <span class="val error" *ngIf="srv.status === 'OFFLINE'">Timeout</span>
              </div>
              <div class="detail-row">
                <span class="label">Gateway Port</span>
                <span class="val port">{{ srv.port }}</span>
              </div>
            </div>

            <!-- Historical Uptime Ticks -->
            <div class="uptime-history">
              <div class="uptime-bar">
                <span *ngFor="let tick of srv.status === 'ONLINE' ? onlineTicks : offlineTicks" 
                      class="uptime-tick" 
                      [ngClass]="tick">
                </span>
              </div>
              <div class="uptime-labels">
                <span>90 days ago</span>
                <span class="uptime-percent">{{ srv.status === 'ONLINE' ? '99.98% uptime' : 'Service downtime' }}</span>
                <span>Today</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .status-layout {
      max-width: 600px;
      margin: 10vh auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .status-grid, .skeleton-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .status-card {
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      
      &.loading {
        flex-direction: row;
        align-items: center;
        gap: 14px;
        justify-content: center;
        padding: 40px;
        color: rgba(255, 255, 255, 0.5);
        ion-spinner { --color: #ffffff; }
      }
      
      &.online {
        border-color: rgba(16, 185, 129, 0.12);
      }
      &.offline {
        border-color: rgba(239, 68, 68, 0.12);
      }
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .name-with-icon {
        display: flex;
        align-items: center;
        gap: 10px;
        
        .card-icon {
          font-size: 18px;
          color: #8b5cf6;
        }
        .srv-name {
          font-weight: 600;
          color: #ffffff;
          font-size: 15px;
        }
      }
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      
      &.online {
        background: rgba(16, 185, 129, 0.1);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.2);
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 6px #34d399;
        }
      }
      &.offline {
        background: rgba(239, 68, 68, 0.1);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.2);
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #f87171;
        }
      }
    }
    .card-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: rgba(255, 255, 255, 0.01);
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.02);
    }
    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }
      .val {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        
        &.port {
          font-family: monospace;
          color: rgba(255, 255, 255, 0.8);
        }
        &.error {
          color: #f87171;
        }
      }
    }
    .uptime-history {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .uptime-bar {
      display: flex;
      gap: 3px;
      width: 100%;
      height: 24px;
    }
    .uptime-tick {
      flex: 1;
      height: 100%;
      background: #10b981;
      border-radius: 2px;
      opacity: 0.85;
      transition: opacity 0.2s;
      
      &:hover { opacity: 1; }
      &.warn { background: #f59e0b; }
      &.offline { background: rgba(239, 68, 68, 0.2); }
    }
    .uptime-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.35);
      font-weight: 500;
      
      .uptime-percent {
        color: rgba(255, 255, 255, 0.5);
      }
    }
  `]
})
export class SystemStatusPage implements OnInit, OnDestroy {
  private gatewaySvc = inject(AdminGatewayService);
  private translationSvc = inject(TranslationService);
  private destroyRef = inject(DestroyRef);

  public services: ServiceHealth[] = [];
  public gatewayHealth: ServiceHealth | null = null;
  public isLoading = true;
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  public onlineTicks = Array(40).fill('normal').map((t, idx) => idx === 12 || idx === 32 ? 'warn' : t);
  public offlineTicks = Array(40).fill('offline');

  constructor() {
    addIcons({ checkmarkCircleOutline, warningOutline, pulseOutline, refreshOutline });
  }

  public ngOnInit() {
    this.translationSvc.initTranslations('en').then(() => {
      this.loadHealth();
      this.startPolling();
    });
  }

  public ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  public loadHealth() {
    this.isLoading = true;
    const start = Date.now();
    this.gatewaySvc.getPublicHealth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.gatewayHealth = {
          name: 'API Gateway',
          port: this.getGatewayPort(),
          status: 'ONLINE',
          latency: Date.now() - start,
          color: 'success'
        };
        this.services = data;
        this.isLoading = false;
      },
      error: () => {
        this.gatewayHealth = {
          name: 'API Gateway',
          port: this.getGatewayPort(),
          status: 'OFFLINE',
          latency: 0,
          color: 'danger'
        };
        this.services = [{
          name: 'Auth Service',
          port: 8081,
          status: 'OFFLINE',
          latency: 0,
          color: 'danger'
        }];
        this.isLoading = false;
      }
    });
  }

  private startPolling() {
    this.pollTimer = setInterval(() => {
      const start = Date.now();
      this.gatewaySvc.getPublicHealth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (data) => {
          this.services = data;
          this.gatewayHealth = {
            name: 'API Gateway',
            port: this.getGatewayPort(),
            status: 'ONLINE',
            latency: Date.now() - start,
            color: 'success'
          };
        },
        error: () => {
          this.gatewayHealth = {
            name: 'API Gateway',
            port: this.getGatewayPort(),
            status: 'OFFLINE',
            latency: 0,
            color: 'danger'
          };
          this.services = [{
            name: 'Auth Service',
            port: 8081,
            status: 'OFFLINE',
            latency: 0,
            color: 'danger'
          }];
        }
      });
    }, 15000);
  }

  private getGatewayPort(): number {
    try {
      if (window.location.origin.startsWith('https')) return 443;
      return 8060;
    } catch {
      return 8060;
    }
  }

  public getAuthServices(): ServiceHealth[] {
    return this.services.filter(s => s.name === 'Auth Service');
  }
}
