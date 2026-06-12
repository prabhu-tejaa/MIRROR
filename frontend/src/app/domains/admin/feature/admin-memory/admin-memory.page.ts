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
  chevronDownOutline, chevronUpOutline, refreshOutline, personOutline
} from 'ionicons/icons';
import { take } from 'rxjs';

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
  private store: Store<object> = inject<Store<object>>(Store);
  private actions$: Actions<import('@ngrx/store').Action<string>> = inject<Actions<import('@ngrx/store').Action<string>>>(Actions);
  private toastSvc: ToastService = inject(ToastService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public activeTab: import('@angular/core').WritableSignal<'UPLOAD' | 'MANAGE'> = signal<'UPLOAD' | 'MANAGE'>('MANAGE');
  public isUploading: import('@angular/core').WritableSignal<boolean> = signal<boolean>(false);
  public searchQuery: import('@angular/core').WritableSignal<string> = signal<string>('');
  public memorySearchQuery: import('@angular/core').WritableSignal<string> = signal<string>('');
  
  public dbRecords: import('@angular/core').Signal<AdminMemoryRecord[]> = this.store.selectSignal(selectMemories);
  public isLoading: import('@angular/core').Signal<boolean> = this.store.selectSignal(selectMemoriesLoading);

  private groupRecords(records: AdminMemoryRecord[]): GroupViewModel[] {
    const groups = new Map<string, MemoryViewModel[]>();
    for (const r of records) {
      const u: string = r.userId || 'Unknown';
      const existing = groups.get(u) || [];
      const cleanEmotion = r.emotion ? r.emotion.split('|')[0] : 'UNKNOWN';
      existing.push({ ...r, cleanEmotion });
      groups.set(u, existing);
    }
    return Array.from(groups.entries()).map(([userId, records]) => ({ userId, records }));
  }

  public cachedGroups: import('@angular/core').Signal<GroupViewModel[]> = computed(() => {
    let allGroups: GroupViewModel[] = this.groupRecords(this.dbRecords() || []);
    allGroups = this.filterBySearchQuery(allGroups);
    allGroups = this.filterByMemoryQuery(allGroups);
    return allGroups;
  });

  private filterBySearchQuery(groups: GroupViewModel[]): GroupViewModel[] {
    const query: string = this.searchQuery();
    if (!query) { return groups; }
    const lowerQuery: string = query.toLowerCase();
    return groups.filter(g => g.userId.toLowerCase().includes(lowerQuery));
  }

  private filterByMemoryQuery(groups: GroupViewModel[]): GroupViewModel[] {
    const query: string = this.memorySearchQuery();
    if (!query) { return groups; }
    const lowerMem: string = query.toLowerCase();
    return groups.map(g => ({
      userId: g.userId,
      records: g.records.filter(r => 
        (r.content || '').toLowerCase().includes(lowerMem) || 
        (r.emotion || '').toLowerCase().includes(lowerMem)
      )
    }));
  }

  public expandedUserId: import('@angular/core').WritableSignal<string | null> = signal<string | null>(null);
  
  public toggleUser(userId: string): void {
    this.expandedUserId.set(this.expandedUserId() === userId ? null : userId);
    this.memorySearchQuery.set('');
  }

  public trackByUserId(_index: number, group: GroupViewModel): string {
    return group.userId;
  }

  constructor() {
    addIcons({
      arrowBackOutline, cloudUploadOutline, informationCircleOutline,
      addCircleOutline, createOutline, trashOutline, saveOutline,
      checkmarkCircleOutline, searchOutline, closeOutline, serverOutline,
      mailOutline, documentTextOutline, heartHalfOutline,
      chevronDownOutline, chevronUpOutline, refreshOutline, personOutline
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

  public onFileSelected(event: Event): void {
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

  public isModalOpen: import('@angular/core').WritableSignal<boolean> = signal<boolean>(false);
  public modalMode: 'ADD' | 'EDIT' = 'ADD';
  public editingId: string | null = null;
  public modalForm: { userId: string; content: string; emotion: string; sender: string; } = {
    userId: '',
    content: '',
    emotion: '',
    sender: 'USER'
  };

  public addRecord(): void {
    this.modalMode = 'ADD';
    this.editingId = null;
    this.modalForm = { userId: '', content: '', emotion: '', sender: 'USER' };
    this.isModalOpen.set(true);
  }

  public editRecord(id: string): void {
    this.modalMode = 'EDIT';
    this.editingId = id;
    const record: AdminMemoryRecord | undefined = (this.dbRecords() || []).find((r: AdminMemoryRecord) => r.id === id);
    if (record) {
      this.modalForm = { 
        userId: record.userId, 
        content: record.content, 
        emotion: record.emotion,
        sender: record.sender || 'USER'
      };
    }
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  public saveModalRecord(): void {
    this.isModalOpen.set(false);
    
    const payload: { userId: string; content: string; emotion: string; sender: string; } = {
      userId: this.modalForm.userId,
      content: this.modalForm.content,
      emotion: this.modalForm.emotion,
      sender: this.modalForm.sender
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

  public get modalTitleValue(): string {
    return this.modalMode === 'ADD' ? 'Create Memory' : 'Edit Memory ' + (this.editingId || '');
  }
}
