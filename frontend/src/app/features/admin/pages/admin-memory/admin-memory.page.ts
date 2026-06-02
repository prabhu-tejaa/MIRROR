import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ToastService } from '../../../../core/services/toast.service';
import { Router } from '@angular/router';
import { AdminMemoryService, AdminMemoryRecord } from '../../../../core/services/admin-memory.service';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, cloudUploadOutline, informationCircleOutline, 
  addCircleOutline, createOutline, trashOutline, saveOutline, 
  checkmarkCircleOutline, searchOutline, closeOutline, serverOutline,
  mailOutline, documentTextOutline, heartHalfOutline
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-admin-memory',
  templateUrl: './admin-memory.page.html',
  styleUrls: ['./admin-memory.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AdminMemoryPage implements OnInit {
  private router = inject(Router);
  private toastSvc = inject(ToastService);
  private adminMemorySvc = inject(AdminMemoryService);
  private destroyRef = inject(DestroyRef);

  public activeTab: 'UPLOAD' | 'MANAGE' = 'MANAGE';
  public isUploading = false;
  public isLoading = true;
  public searchQuery = '';
  
  public dbRecords: AdminMemoryRecord[] = [];

  public get filteredRecords() {
    if (!this.searchQuery) return this.dbRecords;
    const lowerQuery = this.searchQuery.toLowerCase();
    return this.dbRecords.filter(r => 
      r.userId?.toLowerCase().includes(lowerQuery) || 
      r.content?.toLowerCase().includes(lowerQuery) ||
      r.emotion?.toLowerCase().includes(lowerQuery)
    );
  }

  constructor() {
    addIcons({
      arrowBackOutline, cloudUploadOutline, informationCircleOutline,
      addCircleOutline, createOutline, trashOutline, saveOutline,
      checkmarkCircleOutline, searchOutline, closeOutline, serverOutline,
      mailOutline, documentTextOutline, heartHalfOutline
    });
  }

  public ngOnInit() {
    this.loadRecords();
  }

  public loadRecords() {
    this.isLoading = true;
    this.adminMemorySvc.getAllMemories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (records: AdminMemoryRecord[]) => {
        this.dbRecords = records;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  public goBack() {
    this.router.navigate(['/admin']);
  }

  public setTab(tab: 'UPLOAD' | 'MANAGE') {
    this.activeTab = tab;
  }

  public async onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.isUploading = true;
      this.adminMemorySvc.uploadMockData(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: async (res: string) => {
          this.isUploading = false;
          this.toastSvc.showSuccess(res);
          this.loadRecords();
        },
        error: () => {
          this.isUploading = false;
        }
      });
    }
  }

  public isModalOpen = false;
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
    this.isModalOpen = true;
  }

  public async editRecord(id: string) {
    this.modalMode = 'EDIT';
    this.editingId = id;
    const record = this.dbRecords.find(r => r.id === id);
    if (record) {
      this.modalForm = { 
        userId: record.userId, 
        content: record.content, 
        emotion: record.emotion 
      };
    }
    this.isModalOpen = true;
  }

  public closeModal() {
    this.isModalOpen = false;
  }

  public saveModalRecord() {
    this.isModalOpen = false;
    
    // Map modal form keys to backend expected keys
    const payload = {
      userId: this.modalForm.userId,
      content: this.modalForm.content,
      emotion: this.modalForm.emotion
    };

    if (this.modalMode === 'ADD') {
      this.adminMemorySvc.createMemory(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: async () => {
          this.toastSvc.showSuccess('New record created successfully!');
          this.loadRecords();
        },
        error: () => {}
      });
    } else if (this.modalMode === 'EDIT' && this.editingId) {
      this.adminMemorySvc.updateMemory(this.editingId, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: async () => {
          this.toastSvc.showSuccess(`Record ${this.editingId} updated!`);
          this.loadRecords();
        },
        error: () => {}
      });
    }
  }

  public deleteRecord(id: string) {
    this.adminMemorySvc.deleteMemory(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (res: string) => {
        this.toastSvc.showError(res);
        this.loadRecords();
      },
      error: () => {}
    });
  }
}
