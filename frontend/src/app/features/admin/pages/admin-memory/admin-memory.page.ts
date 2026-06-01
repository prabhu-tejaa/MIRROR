import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AdminMemoryService, AdminMemoryRecord } from '../../../../core/services/admin-memory.service';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, cloudUploadOutline, informationCircleOutline, 
  addCircleOutline, createOutline, trashOutline, saveOutline, 
  checkmarkCircleOutline, searchOutline, closeOutline, serverOutline,
  mailOutline, documentTextOutline, heartHalfOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-admin-memory',
  templateUrl: './admin-memory.page.html',
  styleUrls: ['./admin-memory.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AdminMemoryPage implements OnInit {
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private adminMemorySvc = inject(AdminMemoryService);

  public activeTab: 'UPLOAD' | 'MANAGE' = 'MANAGE';
  public isUploading = false;
  public isLoading = true;
  public searchQuery = '';
  
  public dbRecords: AdminMemoryRecord[] = [];

  public get filteredRecords() {
    if (!this.searchQuery) return this.dbRecords;
    const lowerQuery = this.searchQuery.toLowerCase();
    return this.dbRecords.filter(r => 
      r.user?.toLowerCase().includes(lowerQuery) || 
      (r as { content?: string }).content?.toLowerCase().includes(lowerQuery) ||
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
    this.adminMemorySvc.getAllMemories().subscribe({
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
      this.adminMemorySvc.uploadMockData(file).subscribe({
        next: async (res: string) => {
          this.isUploading = false;
          const toast = await this.toastCtrl.create({
            message: res,
            duration: 3000,
            color: 'success',
            position: 'top',
            icon: 'checkmark-circle-outline'
          });
          toast.present();
          this.loadRecords();
        },
        error: async () => {
          this.isUploading = false;
          const toast = await this.toastCtrl.create({
            message: 'Failed to upload mock data',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          toast.present();
        }
      });
    }
  }

  public isModalOpen = false;
  public modalMode: 'ADD' | 'EDIT' = 'ADD';
  public editingId: string | null = null;
  public modalForm = {
    user: '',
    content: '',
    emotion: ''
  };

  public async addRecord() {
    this.modalMode = 'ADD';
    this.editingId = null;
    this.modalForm = { user: '', content: '', emotion: '' };
    this.isModalOpen = true;
  }

  public async editRecord(id: string) {
    this.modalMode = 'EDIT';
    this.editingId = id;
    const record = this.dbRecords.find(r => r.id === id);
    if (record) {
      this.modalForm = { 
        user: record.user, 
        content: (record as { content?: string }).content || '', 
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
    
    // Map modal form keys to backend expected keys (user -> userId)
    const payload = {
      userId: this.modalForm.user,
      content: this.modalForm.content,
      emotion: this.modalForm.emotion
    };

    if (this.modalMode === 'ADD') {
      this.adminMemorySvc.createMemory(payload).subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: 'New record created successfully!',
            duration: 2000,
            color: 'success',
            position: 'top',
            icon: 'checkmark-circle-outline'
          });
          toast.present();
          this.loadRecords();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Failed to create record',
            duration: 2000,
            color: 'danger',
            position: 'top'
          });
          toast.present();
        }
      });
    } else if (this.modalMode === 'EDIT' && this.editingId) {
      this.adminMemorySvc.updateMemory(this.editingId, payload).subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: `Record ${this.editingId} updated!`,
            duration: 2000,
            color: 'success',
            position: 'top',
            icon: 'checkmark-circle-outline'
          });
          toast.present();
          this.loadRecords();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Failed to update record',
            duration: 2000,
            color: 'danger',
            position: 'top'
          });
          toast.present();
        }
      });
    }
  }

  public deleteRecord(id: string) {
    this.adminMemorySvc.deleteMemory(id).subscribe({
      next: async (res: string) => {
        const toast = await this.toastCtrl.create({
          message: res,
          duration: 2000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
        this.loadRecords();
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Failed to delete record',
          duration: 2000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      }
    });
  }
}
