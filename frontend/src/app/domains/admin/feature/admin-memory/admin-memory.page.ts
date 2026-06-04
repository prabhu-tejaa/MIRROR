import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ToastService } from '../../../../core/services/toast.service';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { AdminActions } from '../../data-access/store/admin.actions';
import { selectMemories, selectMemoriesLoading } from '../../data-access/store/admin.selectors';
import { AdminMemoryRecord } from '../../data-access/admin-memory.service';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, cloudUploadOutline, informationCircleOutline, 
  addCircleOutline, createOutline, trashOutline, saveOutline, 
  checkmarkCircleOutline, searchOutline, closeOutline, serverOutline,
  mailOutline, documentTextOutline, heartHalfOutline,
  chevronDownOutline, chevronUpOutline, refreshOutline
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-admin-memory',
  templateUrl: './admin-memory.page.html',
  styleUrls: ['./admin-memory.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminMemoryPage implements OnInit {
  private router = inject(Router);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private toastSvc = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  public activeTab = signal<'UPLOAD' | 'MANAGE'>('MANAGE');
  public isUploading = signal(false);
  public searchQuery = signal('');
  public memorySearchQuery = signal('');
  
  public dbRecords = this.store.selectSignal(selectMemories);
  public isLoading = this.store.selectSignal(selectMemoriesLoading);

  public cachedGroups = computed(() => {
    const groups = new Map<string, AdminMemoryRecord[]>();
    for (const r of (this.dbRecords() || [])) {
      const u = r.userId || 'Unknown';
      if (!groups.has(u)) groups.set(u, []);
      groups.get(u)!.push(r);
    }
    
    let allGroups = Array.from(groups.entries()).map(([userId, records]) => ({ userId, records }));
    
    const query = this.searchQuery();
    if (query) {
      const lowerQuery = query.toLowerCase();
      allGroups = allGroups.filter(g => g.userId.toLowerCase().includes(lowerQuery));
    }
    return allGroups;
  });

  public expandedUserId = signal<string | null>(null);
  
  public toggleUser(userId: string) {
    this.expandedUserId.set(this.expandedUserId() === userId ? null : userId);
    this.memorySearchQuery.set('');
  }

  public trackByUserId(index: number, group: { userId: string }): string {
    return group.userId;
  }

  public getFilteredMemories(records: AdminMemoryRecord[]) {
    const query = this.memorySearchQuery();
    if (!query) return records;
    const lowerQuery = query.toLowerCase();
    return records.filter(r => 
      r.content?.toLowerCase().includes(lowerQuery) || 
      r.emotion?.toLowerCase().includes(lowerQuery)
    );
  }

  public getCleanEmotion(emotionRaw: string): string {
    if (!emotionRaw) return 'UNKNOWN';
    return emotionRaw.split('|')[0];
  }

  constructor() {
    addIcons({
      arrowBackOutline, cloudUploadOutline, informationCircleOutline,
      addCircleOutline, createOutline, trashOutline, saveOutline,
      checkmarkCircleOutline, searchOutline, closeOutline, serverOutline,
      mailOutline, documentTextOutline, heartHalfOutline,
      chevronDownOutline, chevronUpOutline, refreshOutline
    });
  }

  public ngOnInit() {
    this.loadRecords();
  }

  public loadRecords() {
    this.store.dispatch(AdminActions.loadMemories());
  }

  public goBack() {
    this.router.navigate(['/admin']);
  }

  public setTab(tab: 'UPLOAD' | 'MANAGE') {
    this.activeTab.set(tab);
  }

  public async onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.isUploading.set(true);
      this.store.dispatch(AdminActions.uploadMockData({ file }));

      this.actions$.pipe(
        ofType(AdminActions.uploadMockDataSuccess),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.isUploading.set(false);
        this.loadRecords();
      });

      this.actions$.pipe(
        ofType(AdminActions.uploadMockDataFailure),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.isUploading.set(false);
      });
    }
  }

  public isModalOpen = signal(false);
  public modalMode: 'ADD' | 'EDIT' = 'ADD';
  public editingId: string | null = null;
  public modalForm = {
    userId: '',
    content: '',
    emotion: ''
  };

  public async addRecord() {
    this.modalMode = 'ADD';
    this.editingId = null;
    this.modalForm = { userId: '', content: '', emotion: '' };
    this.isModalOpen.set(true);
  }

  public async editRecord(id: string) {
    this.modalMode = 'EDIT';
    this.editingId = id;
    const record = (this.dbRecords() || []).find(r => r.id === id);
    if (record) {
      this.modalForm = { 
        userId: record.userId, 
        content: record.content, 
        emotion: record.emotion 
      };
    }
    this.isModalOpen.set(true);
  }

  public closeModal() {
    this.isModalOpen.set(false);
  }

  public saveModalRecord() {
    this.isModalOpen.set(false);
    
    const payload = {
      userId: this.modalForm.userId,
      content: this.modalForm.content,
      emotion: this.modalForm.emotion
    };

    if (this.modalMode === 'ADD') {
      this.store.dispatch(AdminActions.createMemory({ data: payload }));
      this.actions$.pipe(
        ofType(AdminActions.createMemorySuccess),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => this.loadRecords());
    } else if (this.modalMode === 'EDIT' && this.editingId) {
      this.store.dispatch(AdminActions.updateMemory({ id: this.editingId, data: payload }));
      this.actions$.pipe(
        ofType(AdminActions.updateMemorySuccess),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => this.loadRecords());
    }
  }

  public deleteRecord(id: string) {
    this.store.dispatch(AdminActions.deleteMemory({ id }));
    this.actions$.pipe(
      ofType(AdminActions.deleteMemorySuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadRecords());
  }
}
