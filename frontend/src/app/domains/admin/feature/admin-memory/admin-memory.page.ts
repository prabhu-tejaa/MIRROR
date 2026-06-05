import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, cloudUploadOutline, informationCircleOutline, 
  addCircleOutline, createOutline, trashOutline, saveOutline, 
  checkmarkCircleOutline, searchOutline, closeOutline, serverOutline,
  mailOutline, documentTextOutline, heartHalfOutline,
  chevronDownOutline, chevronUpOutline, refreshOutline
} from 'ionicons/icons';
import { take } from 'rxjs/operators';

import { ToastService } from '../../../../core/services/toast.service';
import { AdminMemoryRecord } from '../../data-access/admin-memory.service';
import { AdminActions } from '../../data-access/store/admin.actions';
import { selectMemories, selectMemoriesLoading } from '../../data-access/store/admin.selectors';


export interface MemoryViewModel extends AdminMemoryRecord {
  cleanEmotion: string;
}

export interface GroupViewModel {
  userId: string;
  records: MemoryViewModel[];
}

@Component({
  selector: 'app-admin-memory',
  templateUrl: './admin-memory.page.html',
  styleUrls: ['./admin-memory.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminMemoryPage implements OnInit {
  private router: Router = inject(Router);
  private store: Store = inject(Store);
  private actions$: Actions = inject(Actions);
  private toastSvc: ToastService = inject(ToastService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public activeTab = signal<'UPLOAD' | 'MANAGE'>('MANAGE');
  public isUploading = signal(false);
  public searchQuery = signal('');
  public memorySearchQuery = signal('');
  
  public dbRecords = this.store.selectSignal(selectMemories);
  public isLoading = this.store.selectSignal(selectMemoriesLoading);

  public cachedGroups = computed(() => {
    const groups = new Map<string, MemoryViewModel[]>();
    for (const r of (this.dbRecords() || [])) {
      const u: string = r.userId || 'Unknown';
      if (!groups.has(u)) { groups.set(u, []); }
      
      const cleanEmotion = r.emotion ? r.emotion.split('|')[0] : 'UNKNOWN';
      groups.get(u)!.push({ ...r, cleanEmotion });
    }
    
    let allGroups: GroupViewModel[] = Array.from(groups.entries()).map(([userId, records]) => ({ userId, records }));
    
    const query: string = this.searchQuery();
    if (query) {
      const lowerQuery: string = query.toLowerCase();
      allGroups = allGroups.filter(g => g.userId.toLowerCase().includes(lowerQuery));
    }

    const memoryQuery: string = this.memorySearchQuery();
    if (memoryQuery) {
      const lowerMem: string = memoryQuery.toLowerCase();
      allGroups = allGroups.map(g => ({
        userId: g.userId,
        records: g.records.filter(r => 
          r.content?.toLowerCase().includes(lowerMem) || 
          r.emotion?.toLowerCase().includes(lowerMem)
        )
      }));
    }

    return allGroups;
  });

  public expandedUserId = signal<string | null>(null);
  
  public toggleUser(userId: string): void {
    this.expandedUserId.set(this.expandedUserId() === userId ? null : userId);
    this.memorySearchQuery.set('');
  }

  public trackByUserId(index: number, group: GroupViewModel): string {
    return group.userId;
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

  public ngOnInit(): void {
    this.loadRecords();
  }

  public loadRecords(): void {
    this.store.dispatch(AdminActions.loadMemories());
  }

  public goBack(): void {
    void this.router.navigate(['/admin']);
  }

  public setTab(tab: 'UPLOAD' | 'MANAGE'): void {
    this.activeTab.set(tab);
  }

  public async onFileSelected(event: Event): Promise<void> {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = target.files?.[0];
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
  public modalForm: { userId: string; content: string; emotion: string; } = {
    userId: '',
    content: '',
    emotion: ''
  };

  public async addRecord(): Promise<void> {
    this.modalMode = 'ADD';
    this.editingId = null;
    this.modalForm = { userId: '', content: '', emotion: '' };
    this.isModalOpen.set(true);
  }

  public async editRecord(id: string): Promise<void> {
    this.modalMode = 'EDIT';
    this.editingId = id;
    const record: AdminMemoryRecord | undefined = (this.dbRecords() || []).find((r: AdminMemoryRecord) => r.id === id);
    if (record) {
      this.modalForm = { 
        userId: record.userId, 
        content: record.content, 
        emotion: record.emotion 
      };
    }
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  public saveModalRecord(): void {
    this.isModalOpen.set(false);
    
    const payload: { userId: string; content: string; emotion: string; } = {
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

  public deleteRecord(id: string): void {
    this.store.dispatch(AdminActions.deleteMemory({ id }));
    this.actions$.pipe(
      ofType(AdminActions.deleteMemorySuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadRecords());
  }

  public get activeTabValue(): 'UPLOAD' | 'MANAGE' {
    return this.activeTab();
  }

  public get isUploadingValue(): boolean {
    return this.isUploading();
  }

  public get searchQueryValue(): string {
    return this.searchQuery();
  }

  public get memorySearchQueryValue(): string {
    return this.memorySearchQuery();
  }

  public get isLoadingValue(): boolean {
    return this.isLoading();
  }

  public get cachedGroupsValue(): GroupViewModel[] {
    return this.cachedGroups();
  }

  public get expandedUserIdValue(): string | null {
    return this.expandedUserId();
  }

  public get isModalOpenValue(): boolean {
    return this.isModalOpen();
  }
}
