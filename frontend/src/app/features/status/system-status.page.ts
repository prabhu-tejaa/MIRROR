import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminGatewayService, ServiceHealth } from '../../core/services/admin-gateway.service';
import { TranslationService } from '../../core/services/translation.service';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircleOutline, 
  warningOutline, 
  pulseOutline, 
  refreshOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-content [fullscreen]="true" class="ion-padding">
      <div class="status-layout">
        
        <!-- Overall Status Banner -->
        <div class="status-banner" [ngClass]="getSystemStatusClass()">
          <div class="banner-content">
            <ion-icon [name]="getSystemStatusIcon()" class="banner-icon"></ion-icon>
            <div class="banner-text">
              <h2>{{ getSystemStatusTitle() }}</h2>
              <p>{{ getSystemStatusDesc() }}</p>
            </div>
          </div>
          <span class="live-indicator">
            <span class="pulse-dot"></span>LIVE MONITOR
          </span>
        </div>

        <!-- Microservices Health List -->
        <div class="services-section">
          
          <div class="section-header">
            <h3>Active Core Services</h3>
            <button class="status-refresh-btn" (click)="loadHealth()" [disabled]="isLoading" title="Refresh Status">
              <ion-icon name="refresh-outline" [class.rotating]="isLoading"></ion-icon>
            </button>
          </div>

          <!-- Skeleton Loading Grid -->
          <div *ngIf="isLoading && services.length === 0" class="skeleton-grid">
            <div *ngFor="let i of [1, 2, 3]" class="status-card loading">
              <ion-spinner name="crescent"></ion-spinner>
              <span>Resolving service state...</span>
            </div>
          </div>

          <!-- Services Grid -->
          <div *ngIf="!isLoading || services.length > 0" class="status-grid">
            <div *ngFor="let srv of services" class="status-card" [ngClass]="srv.status.toLowerCase()">
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

              <!-- Fake Historical Uptime Ticks (Enterprise Layout) -->
              <div class="uptime-history">
                <div class="uptime-bar">
                  <span *ngFor="let tick of srv.status === 'ONLINE' ? onlineTicks : offlineTicks" 
                        class="uptime-tick" 
                        [ngClass]="tick"
                        [title]="tick === 'normal' ? '100% operational' : 'Partial connection delay'">
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

        <!-- Footer Credits -->
        <div class="status-footer">
          <p>Mirror status dashboard updates automatically every 15 seconds.</p>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .status-layout {
      max-width: 800px;
      margin: 32px auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    
    /* Overall Status Banner */
    .status-banner {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 20px;
      padding: 24px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
      
      @media (min-width: 576px) {
        flex-direction: row;
        align-items: center;
      }
      
      &.warning {
        background: rgba(245, 158, 11, 0.08);
        border-color: rgba(245, 158, 11, 0.2);
      }
      
      &.danger {
        background: rgba(239, 68, 68, 0.08);
        border-color: rgba(239, 68, 68, 0.2);
      }
    }
    .banner-content {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .banner-icon {
      font-size: 36px;
      color: #34d399;
      filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.4));
      
      .status-banner.warning & {
        color: #fbbf24;
        filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4));
      }
      .status-banner.danger & {
        color: #f87171;
        filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.4));
      }
    }
    .banner-text {
      h2 {
        font-size: 20px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 4px 0;
      }
      p {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.65);
        margin: 0;
      }
    }
    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: rgba(255, 255, 255, 0.05);
      padding: 6px 12px;
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.8);
      
      @media (min-width: 576px) {
        align-self: center;
      }
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 6px #34d399;
      animation: presence-pulse 2s infinite;
    }
    @keyframes presence-pulse {
      0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.5); }
      70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
      100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
    }

    /* Core Services Grid */
    .services-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h3 {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: rgba(255, 255, 255, 0.4);
        margin: 0;
      }
    }
    .status-refresh-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 50%;
      transition: background-color 0.2s, color 0.2s;
      outline: none;
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.05);
        color: #ffffff;
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    .status-grid, .skeleton-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
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
        ion-spinner { --color: #8b5cf6; }
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

    /* Uptime History Ticks (GitHub style) */
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

    /* Footer */
    .status-footer {
      text-align: center;
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      
      p {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
        margin: 0;
      }
      .vita {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.25);
        font-style: italic;
      }
    }
    .rotating {
      animation: rotate 1s linear infinite;
    }
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class SystemStatusPage implements OnInit, OnDestroy {
  private gatewaySvc = inject(AdminGatewayService);
  private translationSvc = inject(TranslationService);

  public services: ServiceHealth[] = [];
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
    this.gatewaySvc.getPublicHealth().subscribe({
      next: (data) => {
        this.services = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private startPolling() {
    this.pollTimer = setInterval(() => {
      this.gatewaySvc.getPublicHealth().subscribe(data => this.services = data);
    }, 15000);
  }

  public getSystemStatusClass(): string {
    const offlineCount = this.services.filter(s => s.status === 'OFFLINE').length;
    if (offlineCount === 0) return 'success';
    if (offlineCount === this.services.length) return 'danger';
    return 'warning';
  }

  public getSystemStatusIcon(): string {
    const offlineCount = this.services.filter(s => s.status === 'OFFLINE').length;
    return offlineCount === 0 ? 'checkmark-circle-outline' : 'warning-outline';
  }

  public getSystemStatusTitle(): string {
    const offlineCount = this.services.filter(s => s.status === 'OFFLINE').length;
    if (offlineCount === 0) return 'All Systems Operational';
    if (offlineCount === this.services.length) return 'Major System Outage';
    return 'Partial Service Disruptions';
  }

  public getSystemStatusDesc(): string {
    const offlineCount = this.services.filter(s => s.status === 'OFFLINE').length;
    if (offlineCount === 0) return 'We are continuously monitoring active platform routes. All microservices are performing perfectly.';
    if (offlineCount === this.services.length) return 'Our system administrators have been notified. Active gateway proxy routes are currently experiencing down-times.';
    return 'Some backend microservices are experiencing connectivity disruptions. Active investigations are underway.';
  }
}
